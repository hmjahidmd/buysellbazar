import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { sendSuccess } from '../../core/utils/response';

export class NotificationController {
  /**
   * 12.1 Get In-App User Notifications
   * GET /api/v1/notifications
   */
  public static async getNotifications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { isRead, page, limit } = req.query as any;

      const result = await NotificationService.getNotifications(
        userId,
        isRead !== undefined ? Boolean(isRead) : undefined,
        page ? Number(page) : 1,
        limit ? Number(limit) : 20
      );

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 12.2 Mark Single Notification As Read
   * PATCH /api/v1/notifications/:id/read
   */
  public static async markAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await NotificationService.markAsRead(userId, id);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 12.3 Mark All Notifications As Read
   * POST /api/v1/notifications/read-all
   */
  public static async markAllAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;

      const result = await NotificationService.markAllAsRead(userId);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 12.4 Register FCM Device Push Token
   * POST /api/v1/notifications/register-fcm
   */
  public static async registerFcmToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { fcmToken, devicePlatform, appVersion } = req.body;

      const result = await NotificationService.registerFcmToken(
        userId,
        fcmToken,
        devicePlatform,
        appVersion
      );

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}
