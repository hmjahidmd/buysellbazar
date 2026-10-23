import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const getNotificationsSchema = {
  query: z.object({
    isRead: z
      .enum(['true', 'false'])
      .optional()
      .transform((val) => (val === undefined ? undefined : val === 'true')),
    page: z
      .string()
      .optional()
      .default('1')
      .transform((val) => parseInt(val, 10))
      .refine((val) => val >= 1, 'Page must be >= 1'),
    limit: z
      .string()
      .optional()
      .default('20')
      .transform((val) => parseInt(val, 10))
      .refine((val) => val >= 1 && val <= 50, 'Limit must be between 1 and 50'),
  }),
};

export const markSingleReadSchema = {
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid notificationId format'),
  }),
};

export const registerFcmSchema = {
  body: z.object({
    fcmToken: z
      .string({ required_error: 'fcmToken is required' })
      .trim()
      .min(10, 'FCM token must be at least 10 characters'),
    devicePlatform: z.enum(['ANDROID', 'IOS', 'WEB'], {
      required_error: 'devicePlatform is required (ANDROID, IOS, or WEB)',
    }),
    appVersion: z.string().trim().optional(),
  }),
};
