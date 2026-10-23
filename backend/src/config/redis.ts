import Redis from 'ioredis';
import env from './env';
import logger from './logger';

let redisClient: any = null;
let isMockMode = false;

export const isRedisMockActive = (): boolean => isMockMode;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    if (isMockMode) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const RedisMock = require('ioredis-mock');
      redisClient = new RedisMock();
      return redisClient;
    }

    redisClient = new Redis(env.REDIS_URI, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 2) return null;
        return 200;
      },
      lazyConnect: true,
      connectTimeout: 2000,
    });

    redisClient.on('connect', () => {
      logger.info('🚀 Redis cache client connected successfully.');
    });

    redisClient.on('error', (err: any) => {
      logger.warn('⚠️ Redis client error: ', err?.message || err);
    });

    redisClient.on('close', () => {
      logger.warn('⚠️ Redis client connection closed.');
    });
  }

  return redisClient;
};

export const connectRedis = async (): Promise<void> => {
  try {
    const client = getRedisClient();
    if (client.status !== 'ready' && client.status !== 'connecting') {
      await client.connect();
    }
  } catch (error) {
    if (env.NODE_ENV === 'development') {
      logger.warn('⚠️ Local Redis not reachable on port 6379. Switching to in-memory Redis mock for local development preview...');
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const RedisMock = require('ioredis-mock');
        redisClient = new RedisMock();
        isMockMode = true;
        logger.info('✨ In-memory Redis mock initialized successfully.');
        return;
      } catch (mockErr) {
        logger.error('Failed to init in-memory Redis mock:', mockErr);
      }
    }
    logger.warn('⚠️ Redis connection failed. Operating in degraded mode: ', error);
  }
};

export const redisGet = async (key: string): Promise<string | null> => {
  try {
    const client = getRedisClient();
    return await client.get(key);
  } catch (error) {
    logger.error(`Redis GET error for key [${key}]: `, error);
    return null;
  }
};

export const redisSetWithExpiry = async (
  key: string,
  value: string,
  expirySeconds: number
): Promise<boolean> => {
  try {
    const client = getRedisClient();
    const result = await client.set(key, value, 'EX', expirySeconds);
    return result === 'OK';
  } catch (error) {
    logger.error(`Redis SET error for key [${key}]: `, error);
    return false;
  }
};

export const redisDel = async (key: string): Promise<boolean> => {
  try {
    const client = getRedisClient();
    const deletedCount = await client.del(key);
    return deletedCount > 0;
  } catch (error) {
    logger.error(`Redis DEL error for key [${key}]: `, error);
    return false;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient && !isMockMode) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed gracefully.');
    } catch (error) {
      logger.error('Error quitting Redis connection: ', error);
    }
  }
};

export default getRedisClient;
