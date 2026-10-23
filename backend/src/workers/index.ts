import { Worker, Job } from 'bullmq';
import { getBullConnection } from '../core/queues/queue.service';
import { ListingExpiryWorker } from './listingExpiryWorker';
import { BoostExpiryWorker } from './boostExpiryWorker';
import { StorefrontGracePeriodWorker } from './storefrontGracePeriodWorker';
import { QuotaResetWorker } from './quotaResetWorker';
import logger from '../config/logger';

let cleanupWorker: Worker | null = null;

export const initializeWorkers = (): Worker | null => {
  try {
    const connection = getBullConnection();

    cleanupWorker = new Worker(
      'scheduled-cleanup',
      async (job: Job) => {
        logger.info(`👷 Executing BullMQ scheduled job: [${job.name}] (ID: ${job.id})`);

        switch (job.name) {
          case 'expire-listings-job':
            return await ListingExpiryWorker.processListingExpirations();

          case 'expire-boosts-job':
            return await BoostExpiryWorker.processBoostExpirations();

          case 'storefront-grace-job':
            return await StorefrontGracePeriodWorker.processStorefrontGracePeriods();

          case 'quota-reset-job':
            return await QuotaResetWorker.processQuotaResets();

          default:
            logger.warn(`Unknown job name in scheduled-cleanup: [${job.name}]`);
            return { acknowledged: false };
        }
      },
      {
        connection,
        concurrency: 2,
      }
    );

    cleanupWorker.on('completed', (job: Job) => {
      logger.info(`✅ Job [${job.name}] (${job.id}) completed successfully.`);
    });

    cleanupWorker.on('failed', (job: Job | undefined, err: Error) => {
      logger.error(`❌ Job [${job?.name}] (${job?.id}) failed with error:`, err);
    });

    logger.info('🚀 BullMQ Worker listeners active.');
    return cleanupWorker;
  } catch (err) {
    logger.warn('Failed to start BullMQ workers (Redis offline?):', err);
    return null;
  }
};

export {
  ListingExpiryWorker,
  BoostExpiryWorker,
  StorefrontGracePeriodWorker,
  QuotaResetWorker,
};
