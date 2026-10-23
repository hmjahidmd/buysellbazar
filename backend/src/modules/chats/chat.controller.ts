import { Request, Response, NextFunction } from 'express';
import { ChatService } from './chat.service';
import { TelephonyService } from './telephony.service';
import { sendSuccess } from '../../core/utils/response';

export class ChatController {
  /**
   * 7.1 Get User Chat Inbox
   */
  public static async getInbox(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await ChatService.getUserInbox(userId, page, limit);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 7.2 Initiate or Fetch Chat Room for Listing
   */
  public static async startRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { listingId } = req.params;

      const result = await ChatService.startOrGetRoom(userId, listingId);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 7.3 Get Message History
   */
  public static async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id: roomId } = req.params;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const result = await ChatService.getMessageHistory(userId, roomId, page, limit);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 7.4 Send In-Chat Message (HTTP Fallback)
   */
  public static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const senderId = req.user!.userId;
      const { id: roomId } = req.params;
      const { content, messageType, attachmentUrl } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await ChatService.sendMessage({
        senderId,
        roomId,
        content,
        messageType,
        attachmentUrl,
        clientIp,
        traceId: req.traceId,
      });

      sendSuccess(res, result, 201, 'Message delivered.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 7.5 Initiate Privacy-Preserving Masked Audio Call Bridge
   */
  public static async proxyCall(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const callerId = req.user!.userId;
      const { id: roomId } = req.params;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      // Parse listingId and recipientId from roomId (`room_<listingId>_<buyerId>`)
      const parts = roomId.split('_');
      const listingId = parts[1];
      const buyerId = parts[2];

      const recipientId = callerId === buyerId ? (req.body.recipientId || parts[2]) : buyerId;

      const result = await TelephonyService.initiateMaskedCall({
        callerId,
        recipientId,
        listingId,
        clientIp,
        traceId: req.traceId,
      });

      sendSuccess(res, result, 200, 'Virtual bridge proxy call scheduled.');
    } catch (error) {
      next(error);
    }
  }
}

export default ChatController;
