import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import env from '../../config/env';
import logger from '../../config/logger';
import { getRedisClient } from '../../config/redis';
import { ChatService } from './chat.service';
import { AuthUser } from '../../core/middlewares/authGuards';

interface AuthenticatedSocket extends Socket {
  user?: AuthUser;
}

export class SocketService {
  private static io: SocketIOServer | null = null;

  public static initialize(server: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(server, {
      path: '/api/v1/chat/ws',
      cors: {
        origin: env.FRONTEND_URL,
        credentials: true,
      },
    });

    // Handshake Authentication Middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          (socket.handshake.headers.authorization &&
            socket.handshake.headers.authorization.split(' ')[1]);

        if (!token) {
          return next(new Error('Authentication token required for WebSocket handshake.'));
        }

        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
        socket.user = {
          userId: decoded.sub as string,
          mobileNumber: decoded.mobile as string,
          role: decoded.role,
          isNidVerified: Boolean(decoded.isNidVerified),
        };

        next();
      } catch (err) {
        logger.warn('WebSocket authentication handshake rejected: ', err);
        next(new Error('Unauthorized WebSocket connection.'));
      }
    });

    // Connection Lifecycle
    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      const user = socket.user!;
      logger.info(`🔌 WebSocket Client connected: [${user.userId}] (Socket ID: ${socket.id})`);

      // 1. Join Personal Room for Instant Notifications
      socket.join(`user:${user.userId}`);

      // 2. Mark Online Presence in Redis
      try {
        const redis = getRedisClient();
        await redis.set(`presence:${user.userId}`, 'online', 'EX', 3600);
      } catch (redisErr) {
        logger.warn('Failed to set presence in Redis: ', redisErr);
      }

      // 3. Handle Joining Chat Room
      socket.on('join_room', ({ roomId }: { roomId: string }) => {
        if (!roomId) return;
        socket.join(roomId);
        logger.info(`Socket [${user.userId}] joined room: [${roomId}]`);
      });

      // 4. Handle Real-Time Messaging & Anti-Scam Filter
      socket.on(
        'send_message',
        async (payload: { roomId: string; content: string; messageType?: string; attachmentUrl?: string }) => {
          try {
            const { roomId, content, messageType, attachmentUrl } = payload;
            if (!roomId || !content) return;

            const result = await ChatService.sendMessage({
              senderId: user.userId,
              roomId,
              content,
              messageType: messageType as any,
              attachmentUrl,
              clientIp: socket.handshake.address || '127.0.0.1',
              traceId: `ws_${Date.now()}`,
            });

            // Broadcast message to room
            this.io?.to(roomId).emit('new_message', result.message);

            // Broadcast scam warning banner if triggered
            if (result.warningMessage) {
              this.io?.to(roomId).emit('scam_warning', result.warningMessage);
            }
          } catch (error) {
            logger.error('Error handling WebSocket send_message: ', error);
            socket.emit('error', { message: 'Failed to process message' });
          }
        }
      );

      // 5. Handle Typing Indicator
      socket.on('typing', ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
        socket.to(roomId).emit('user_typing', { userId: user.userId, isTyping });
      });

      // 6. Handle Disconnect
      socket.on('disconnect', async () => {
        logger.info(`🔌 WebSocket Client disconnected: [${user.userId}]`);
        try {
          const redis = getRedisClient();
          await redis.del(`presence:${user.userId}`);
        } catch (err) {
          logger.warn('Failed to clear presence in Redis: ', err);
        }
      });
    });

    return this.io;
  }

  public static getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.io server not initialized');
    }
    return this.io;
  }

  public static sendToUser(userId: string, event: string, payload: unknown): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, payload);
    }
  }
}

export default SocketService;
