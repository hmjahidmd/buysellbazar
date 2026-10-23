import { Router } from 'express';
import { NotificationController } from './notification.controller';
import {
  getNotificationsSchema,
  markSingleReadSchema,
  registerFcmSchema,
} from './notification.validation';
import { requireAuth } from '../../core/middlewares/authGuards';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { createRateLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

const notifQueryLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: 'rl_notif_query',
});

const readAllLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'rl_notif_read_all',
});

const fcmLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyPrefix: 'rl_notif_fcm',
});

// 12.1 Get In-App User Notifications: GET /api/v1/notifications
router.get(
  '/',
  requireAuth,
  notifQueryLimiter,
  validateRequest(getNotificationsSchema),
  NotificationController.getNotifications
);

// 12.3 Mark All Notifications As Read: POST /api/v1/notifications/read-all
router.post(
  '/read-all',
  requireAuth,
  readAllLimiter,
  NotificationController.markAllAsRead
);

// 12.4 Register FCM Device Push Token: POST /api/v1/notifications/register-fcm
router.post(
  '/register-fcm',
  requireAuth,
  fcmLimiter,
  validateRequest(registerFcmSchema),
  NotificationController.registerFcmToken
);

// 12.2 Mark Single Notification As Read: PATCH /api/v1/notifications/:id/read
router.patch(
  '/:id/read',
  requireAuth,
  validateRequest(markSingleReadSchema),
  NotificationController.markAsRead
);

export default router;
