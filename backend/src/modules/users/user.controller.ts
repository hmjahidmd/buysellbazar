import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { sendSuccess } from '../../core/utils/response';

export class UserController {
  /**
   * 4.1 Get Authenticated User Profile
   */
  public static async getSelf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await UserService.getSelfProfile(userId);

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4.2 Update User Profile & Privacy Settings
   */
  public static async updateSelf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await UserService.updateProfile(userId, req.body);

      sendSuccess(res, result, 200, 'Profile updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4.3 Check Daily Free Ad Quota Status
   */
  public static async getQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await UserService.checkDailyQuota(userId);

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4.4 Get Public Seller Profile & Feedback
   */
  public static async getPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await UserService.getPublicProfile(id);

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4.5 Save / Bookmark a Listing
   */
  public static async toggleSaved(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { listingId } = req.params;
      const result = await UserService.toggleSavedListing(userId, listingId);

      sendSuccess(res, result, 200, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4.6 List User's Saved Bookmarks
   */
  public static async getSaved(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await UserService.getSavedListings(userId, page, limit);

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export default UserController;
