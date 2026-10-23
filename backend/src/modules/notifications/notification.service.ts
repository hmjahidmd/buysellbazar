import { Types } from 'mongoose';
import {
  Notification,
  INotificationDocument,
  NotificationType,
} from './notification.model';
import { User } from '../users/user.model';
import { SocketService } from '../chats/socket.service';
import logger from '../../config/logger';
import { NotFoundError } from '../../core/errors/AppError';

export class NotificationService {
  /**
   * Helper to persist and dispatch real-time notifications
   */
  public static async createAndDispatchNotification(params: {
    recipientId: string | Types.ObjectId;
    type: NotificationType;
    title: string;
    body: string;
    entityType?: string;
    entityId?: string | Types.ObjectId;
  }): Promise<INotificationDocument> {
    const notification = await Notification.create({
      recipientId: new Types.ObjectId(params.recipientId),
      type: params.type,
      title: params.title,
      body: params.body,
      entityType: params.entityType,
      entityId: params.entityId,
      isRead: false,
    });

    // 1. Dispatch real-time WebSocket push event
    try {
      SocketService.sendToUser(params.recipientId.toString(), 'server:notification', {
        notificationId: notification._id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        entityType: notification.entityType,
        entityId: notification.entityId,
        createdAt: notification.createdAt,
      });
    } catch (wsErr) {
      logger.warn('Failed to emit real-time notification via WebSocket:', wsErr);
    }

    // 2. Dispatch mobile FCM push if token registered (mock / Firebase Admin SDK integration)
    try {
      const user = await User.findById(params.recipientId).select('fcmToken devicePlatform');
      if (user?.fcmToken) {
        logger.info(
          `[FCM Push] Dispatched to token: ${user.fcmToken.slice(0, 15)}... Title: "${params.title}"`
        );
      }
    } catch (fcmErr) {
      logger.warn('FCM push dispatch failed:', fcmErr);
    }

    return notification;
  }

  /**
   * 12.1 Get In-App User Notifications
   */
  public static async getNotifications(
    userId: string,
    isReadFilter?: boolean,
    page = 1,
    limit = 20
  ) {
    const filter: Record<string, unknown> = {
      recipientId: new Types.ObjectId(userId),
    };

    if (isReadFilter !== undefined) {
      filter.isRead = isReadFilter;
    }

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      recipientId: new Types.ObjectId(userId),
      isRead: false,
    });

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formatted = notifications.map((n: any) => ({
      notificationId: n._id,
      type: n.type,
      title: n.title,
      body: n.body,
      entityType: n.entityType,
      entityId: n.entityId,
      isRead: n.isRead,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }));

    return {
      unreadCount,
      total,
      page,
      limit,
      notifications: formatted,
    };
  }

  /**
   * 12.2 Mark Single Notification As Read
   */
  public static async markAsRead(userId: string, notificationId: string) {
    const notification = await Notification.findOne({
      _id: new Types.ObjectId(notificationId),
      recipientId: new Types.ObjectId(userId),
    });

    if (!notification) {
      throw new NotFoundError('Notification not found.', 'NOTIFICATION_NOT_FOUND');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return {
      notificationId: notification._id,
      isRead: notification.isRead,
      readAt: notification.readAt,
    };
  }

  /**
   * 12.3 Mark All Notifications As Read
   */
  public static async markAllAsRead(userId: string) {
    const readAt = new Date();
    const result = await Notification.updateMany(
      {
        recipientId: new Types.ObjectId(userId),
        isRead: false,
      },
      {
        isRead: true,
        readAt,
      }
    );

    return {
      markedReadCount: result.modifiedCount,
      readAt,
    };
  }

  /**
   * 12.4 Register FCM Device Push Token
   */
  public static async registerFcmToken(
    userId: string,
    fcmToken: string,
    devicePlatform: 'ANDROID' | 'IOS' | 'WEB',
    _appVersion?: string
  ) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.', 'USER_NOT_FOUND');
    }

    user.fcmToken = fcmToken;
    user.devicePlatform = devicePlatform;
    await user.save();

    return {
      registered: true,
      devicePlatform: user.devicePlatform,
      updatedAt: user.updatedAt,
    };
  }
}
