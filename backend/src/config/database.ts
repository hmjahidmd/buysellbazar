import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import env from './env';
import logger from './logger';

let memoryServer: any = null;

export const connectDatabase = async (): Promise<typeof mongoose> => {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    logger.info('📦 MongoDB connected successfully.');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('📦 MongoDB connection error: ', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️ MongoDB disconnected.');
  });

  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      autoIndex: env.NODE_ENV !== 'production',
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 2000,
      socketTimeoutMS: 45000,
    });
    return conn;
  } catch (error) {
    if (env.NODE_ENV === 'development') {
      logger.warn('⚠️ Local MongoDB not found on port 27017. Starting persistent embedded MongoDB on disk for local development...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        
        // Persist data in backend/data/mongodb so users and listings are NEVER lost across restarts
        const dbPath = path.resolve(process.cwd(), 'data/mongodb');
        if (!fs.existsSync(dbPath)) {
          fs.mkdirSync(dbPath, { recursive: true });
        }

        memoryServer = await MongoMemoryServer.create({
          instance: {
            dbPath,
            storageEngine: 'wiredTiger',
          },
        });

        const memUri = memoryServer.getUri();
        logger.info(`✨ Persistent MongoDB instance running at: ${memUri} (Data stored at: ${dbPath})`);
        const conn = await mongoose.connect(memUri);
        return conn;
      } catch (memErr) {
        logger.error('❌ Failed to start persistent MongoDB server: ', memErr);
        throw error;
      }
    }
    logger.error('❌ Failed to connect to MongoDB: ', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    if (memoryServer) {
      await memoryServer.stop();
    }
    logger.info('MongoDB connection closed gracefully.');
  } catch (error) {
    logger.error('Error closing MongoDB connection: ', error);
  }
};

export default connectDatabase;
