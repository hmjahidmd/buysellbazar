import { z } from 'zod';

export const submitOfferSchema = {
  params: z.object({
    listingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid listing ID format'),
  }),
  body: z.object({
    offeredPrice: z.coerce.number().min(1, 'Offered price must be at least 1 BDT'),
  }),
};

export const offerIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid offer ID format'),
  }),
};

export const counterOfferSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid offer ID format'),
  }),
  body: z.object({
    counterPrice: z.coerce.number().min(1, 'Counter price must be at least 1 BDT'),
  }),
};

export const declineOfferSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid offer ID format'),
  }),
  body: z.object({
    reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
  }),
};

export const offersQuerySchema = {
  query: z.object({
    listingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid listing ID format').optional(),
    status: z
      .enum(['PENDING', 'COUNTERED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED', 'VOIDED'])
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
};

export default {
  submitOfferSchema,
  offerIdParamSchema,
  counterOfferSchema,
  declineOfferSchema,
  offersQuerySchema,
};
