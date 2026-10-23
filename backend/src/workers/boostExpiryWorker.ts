import { Listing } from '../modules/listings/listing.model';
import logger from '../config/logger';

export class BoostExpiryWorker {
  /**
   * Scans for listings whose TOP_AD duration has elapsed and resets the top ad flag
   */
  public static async processBoostExpirations(): Promise<{ resetCount: number }> {
    const now = new Date();
    try {
      const updateResult = await Listing.updateMany(
        {
          'boost.isTopAd': true,
          'boost.topAdExpiresAt': { $lt: now },
        },
        {
          $set: {
            'boost.isTopAd': false,
          },
        }
      );

      logger.info(`⚡ BoostExpiryWorker: ${updateResult.modifiedCount} TOP_AD boosts expired and reset.`);
      return { resetCount: updateResult.modifiedCount };
    } catch (error) {
      logger.error('Error in BoostExpiryWorker:', error);
      throw error;
    }
  }
}

export default BoostExpiryWorker;
