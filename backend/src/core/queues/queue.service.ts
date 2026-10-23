import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';
import env from '../../config/env';
import logger from '../../config/logger';

// BullMQ requires maxRetriesPerRequest: null on its Redis connections
export const getBullConnection = (): Redis => {
  return new Redis(env.REDIS_URI, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
};

const queueDefaultOptions: QueueOptions = {
  connection: getBullConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
};

export class QueueService {
  public static mediaProcessingQueue: Queue;
  public static notificationQueue: Queue;
  public static scheduledCleanupQueue: Queue;

  public static initialize(): void {
    try {
      this.mediaProcessingQueue = new Queue('media-processing', queueDefaultOptions);
      this.notificationQueue = new Queue('notifications-dispatch', queueDefaultOptions);
      this.scheduledCleanupQueue = new Queue('scheduled-cleanup', queueDefaultOptions);

      logger.info('🚀 BullMQ Queues initialized (media, notifications, cleanup).');
    } catch (err) {
      logger.error('Failed to initialize BullMQ queues:', err);
    }
  }

  /**
   * Schedule recurring maintenance and cleanup cron jobs
   */
  public static async registerScheduledCrons(): Promise<void> {
    if (!this.scheduledCleanupQueue) return;

    try {
      // 1. Daily Listing Expiration (Daily at 00:05 UTC)
      await this.scheduledCleanupQueue.upsertJobScheduler(
        'daily-listing-expiry',
        { pattern: '5 0 * * *' },
        { name: 'expire-listings-job' }
      );

      // 2. Hourly Top-Ad Boost Expiration (Every hour at minute 0)
      await this.scheduledCleanupQueue.upsertJobScheduler(
        'hourly-boost-expiry',
        { pattern: '0 * * * *' },
        { name: 'expire-boosts-job' }
      );

      // 3. Daily Storefront Grace Period Audit (Daily at 00:10 UTC)
      await this.scheduledCleanupQueue.upsertJobScheduler(
        'daily-storefront-grace',
        { pattern: '10 0 * * *' },
        { name: 'storefront-grace-job' }
      );

      // 4. Daily Ad Quota Reset (Daily at 00:00 UTC)
      await this.scheduledCleanupQueue.upsertJobScheduler(
        'daily-quota-reset',
        { pattern: '0 0 * * *' },
        { name: 'quota-reset-job' }
      );

      logger.info('⏰ BullMQ Cron jobs registered successfully.');
    } catch (err) {
      logger.warn('Failed to register recurring BullMQ cron jobs (Redis offline?):', err);
    }
  }
}

export default QueueService;
