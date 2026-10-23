import { Listing } from '../modules/listings/listing.model';
import { NotificationService } from '../modules/notifications/notification.service';
import logger from '../config/logger';

export class ListingExpiryWorker {
  /**
   * Scans for active listings past their 30-day lifecycle and transitions them to EXPIRED
   */
  public static async processListingExpirations(): Promise<{ expiredCount: number }> {
    const now = new Date();
    try {
      // Find listings to notify sellers
      const expiredListings = await Listing.find({
        status: 'ACTIVE',
        expiresAt: { $lt: now },
      }).select('_id title sellerId');

      if (expiredListings.length === 0) {
        return { expiredCount: 0 };
      }

      const listingIds = expiredListings.map((l) => l._id);

      const updateResult = await Listing.updateMany(
        { _id: { $in: listingIds } },
        { status: 'EXPIRED' }
      );

      // Notify sellers
      for (const listing of expiredListings) {
        try {
          await NotificationService.createAndDispatchNotification({
            recipientId: listing.sellerId,
            type: 'SYSTEM_ALERT',
            title: 'Ad Expired',
            body: `Your listing "${listing.title}" has reached its 30-day limit and has expired. You may renew it anytime.`,
            entityType: 'Listing',
            entityId: listing._id,
          });
        } catch (notifErr) {
          logger.warn(`Failed to notify seller for expired listing [${listing._id}]:`, notifErr);
        }
      }

      logger.info(`🧹 ListingExpiryWorker: ${updateResult.modifiedCount} listings transitioned to EXPIRED.`);
      return { expiredCount: updateResult.modifiedCount };
    } catch (error) {
      logger.error('Error in ListingExpiryWorker:', error);
      throw error;
    }
  }
}

export default ListingExpiryWorker;
