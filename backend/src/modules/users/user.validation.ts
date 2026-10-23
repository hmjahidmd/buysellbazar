import { z } from 'zod';

export const updateProfileSchema = {
  body: z.object({
    displayName: z.string().trim().min(2, 'Display name must be at least 2 characters').max(50).optional(),
    avatarUrl: z.string().optional(),
    bio: z.string().trim().max(500, 'Bio cannot exceed 500 characters').optional(),
    division: z.string().trim().optional(),
    district: z.string().trim().optional(),
    thana: z.string().trim().optional(),
  }),
};

export const publicProfileSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format. Must be a 24-character hex ObjectId'),
  }),
};

export const savedListingSchema = {
  params: z.object({
    listingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid listing ID format. Must be a 24-character hex ObjectId'),
  }),
};

export const listSavedListingsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
};

export default {
  updateProfileSchema,
  publicProfileSchema,
  savedListingSchema,
  listSavedListingsSchema,
};
