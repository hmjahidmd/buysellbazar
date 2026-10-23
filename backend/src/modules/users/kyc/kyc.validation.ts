import { z } from 'zod';

export const verifyLivenessSchema = {
  body: z.object({
    kycSessionId: z.string().uuid('kycSessionId must be a valid UUIDv4'),
    mockConfidenceScore: z.coerce.number().min(0).max(100).optional(),
  }),
};

export const adminKycReviewSchema = {
  params: z.object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
  }),
  body: z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    reviewNotes: z.string().min(5, 'Review notes must be at least 5 characters long').max(1000),
  }),
};

export default {
  verifyLivenessSchema,
  adminKycReviewSchema,
};
