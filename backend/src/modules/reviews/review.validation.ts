import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId format');

export const submitReviewSchema = {
  params: z.object({
    listingId: objectIdSchema,
  }),
  body: z.object({
    offerId: objectIdSchema,
    rating: z
      .number({ required_error: 'Rating is required' })
      .int()
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating cannot exceed 5'),
    comment: z
      .string({ required_error: 'Comment is required' })
      .trim()
      .min(5, 'Review comment must be at least 5 characters')
      .max(1000, 'Review comment cannot exceed 1000 characters'),
  }),
};

export const editReviewSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      rating: z.number().int().min(1).max(5).optional(),
      comment: z.string().trim().min(5).max(1000).optional(),
    })
    .refine((data) => data.rating !== undefined || data.comment !== undefined, {
      message: 'At least one field (rating or comment) must be provided for edit',
    }),
};

export const replyToReviewSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    comment: z
      .string({ required_error: 'Reply comment is required' })
      .trim()
      .min(2, 'Reply comment must be at least 2 characters')
      .max(1000, 'Reply comment cannot exceed 1000 characters'),
  }),
};

export const getSellerReviewsSchema = {
  params: z.object({
    sellerId: objectIdSchema,
  }),
  query: z.object({
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

export const reportReviewSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    reason: z.enum([
      'HARASSMENT',
      'SPAM',
      'FAKE_REVIEW',
      'INAPPROPRIATE_LANGUAGE',
      'OTHER',
    ]),
    details: z.string().trim().max(500).optional(),
  }),
};
