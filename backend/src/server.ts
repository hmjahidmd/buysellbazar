import http from 'http';
import app from './app';
import env from './config/env';
import logger from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis, isRedisMockActive } from './config/redis';
import SocketService from './modules/chats/socket.service';
import QueueService from './core/queues/queue.service';
import { initializeWorkers } from './workers';

const server = http.createServer(app);

const startServer = async () => {
  try {
    logger.info('🚀 Initializing BuySell BD Platform Backend Services...');

    // Connect to primary persistence database
    await connectDatabase();

    // Connect to in-memory Redis layer
    await connectRedis();

    // Start HTTP listener
    server.listen(env.PORT, () => {
      logger.info(`✅ HTTP Server listening on port ${env.PORT} in [${env.NODE_ENV}] mode.`);
      logger.info(`🔗 Health check available at: http://localhost:${env.PORT}/health`);

      // Initialize Real-Time WebSocket Gateway
      SocketService.initialize(server);
      logger.info(`⚡ WebSocket Chat Gateway initialized at path: /api/v1/chat/ws`);

      // Initialize BullMQ Queues and Background Schedulers
      if (!isRedisMockActive()) {
        QueueService.initialize();
        QueueService.registerScheduledCrons();
        initializeWorkers();
      } else {
        logger.info('ℹ️ Running in Mock Redis mode: BullMQ background schedulers paused.');
      }
    });
  } catch (error) {
    logger.error('❌ Fatal error during server bootstrap: ', error);
    process.exit(1);
  }
};

const handleGracefulShutdown = (signal: string) => {
  logger.warn(`⚠️ Received ${signal}. Initiating graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      await disconnectDatabase();
      await disconnectRedis();
      logger.info('✅ All connections closed cleanly. Process exiting.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during cleanup: ', err);
      process.exit(1);
    }
  });

  // Force shutdown if cleanup hangs for over 10s
  setTimeout(() => {
    logger.error('❌ Forced shutdown timed out. Exiting now.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('❌ Unhandled Promise Rejection: ', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('❌ Uncaught Exception: ', error);
  process.exit(1);
});

// Run server bootstrap
startServer();
