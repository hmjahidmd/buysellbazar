import { User } from '../modules/users/user.model';
import logger from '../config/logger';

export class QuotaResetWorker {
  /**
   * Resets dailyAdCount = 0 for all users at 00:00 UTC
   */
  public static async processQuotaResets(): Promise<{ resetCount: number }> {
    try {
      const updateResult = await User.updateMany(
        { dailyAdCount: { $gt: 0 } },
        { $set: { dailyAdCount: 0 } }
      );

      logger.info(`🔄 QuotaResetWorker: Reset daily ad count for ${updateResult.modifiedCount} users.`);
      return { resetCount: updateResult.modifiedCount };
    } catch (error) {
      logger.error('Error in QuotaResetWorker:', error);
      throw error;
    }
  }
}

export default QuotaResetWorker;
