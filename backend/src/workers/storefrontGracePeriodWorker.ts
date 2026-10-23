import { Storefront } from '../modules/storefronts/storefront.model';
import { NotificationService } from '../modules/notifications/notification.service';
import logger from '../config/logger';

export class StorefrontGracePeriodWorker {
  /**
   * Scans for storefront subscriptions entering the 5-day grace period or expiring permanently
   */
  public static async processStorefrontGracePeriods(): Promise<{
    warnedCount: number;
    expiredCount: number;
  }> {
    const now = new Date();
    let warnedCount = 0;
    let expiredCount = 0;

    try {
      // 1. Storefronts in active 5-day grace period (subscription expired, but grace period not yet expired)
      const inGrace = await Storefront.find({
        status: 'ACTIVE',
        subscriptionExpiresAt: { $lt: now },
        gracePeriodExpiresAt: { $gt: now },
      }).select('_id storeName merchantId gracePeriodExpiresAt');

      for (const store of inGrace) {
        try {
          await NotificationService.createAndDispatchNotification({
            recipientId: store.merchantId,
            type: 'SYSTEM_ALERT',
            title: 'Storefront Subscription Expired',
            body: `Your storefront subscription has expired. You are currently in a 5-day grace period until ${store.gracePeriodExpiresAt.toDateString()} before storefront features are suspended.`,
            entityType: 'Storefront',
            entityId: store._id,
          });
          warnedCount++;
        } catch (warnErr) {
          logger.warn(`Failed to dispatch grace warning for store [${store._id}]:`, warnErr);
        }
      }

      // 2. Storefronts whose 5-day grace period has passed (gracePeriodExpiresAt < now)
      const expiredRes = await Storefront.updateMany(
        {
          status: 'ACTIVE',
          gracePeriodExpiresAt: { $lt: now },
        },
        {
          $set: { status: 'EXPIRED' },
        }
      );
      expiredCount = expiredRes.modifiedCount;

      logger.info(
        `🏬 StorefrontGracePeriodWorker: ${warnedCount} merchants warned, ${expiredCount} storefronts marked EXPIRED.`
      );

      return { warnedCount, expiredCount };
    } catch (error) {
      logger.error('Error in StorefrontGracePeriodWorker:', error);
      throw error;
    }
  }
}

export default StorefrontGracePeriodWorker;
