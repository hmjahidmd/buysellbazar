import { z } from 'zod';

export const createListingSchema = {
  body: z.object({
    title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
    description: z.string().trim().min(10, 'Description must be at least 10 characters').max(3000),
    category: z.string().trim().min(2, 'Category is required'),
    subCategory: z.string().trim().optional(),
    specifications: z.array(z.object({
      key: z.string().trim().min(1).max(80),
      value: z.string().trim().min(1).max(200),
    })).max(50).optional(),
    price: z.coerce.number().min(0, 'Price must be 0 (free) or greater'),
    isNegotiable: z.coerce.boolean().default(false),
    condition: z.enum(['BRAND_NEW', 'LIKE_NEW', 'USED', 'FOR_PARTS']),
    location: z.object({
      division: z.string().trim().min(1, 'Division is required'),
      district: z.string().trim().min(1, 'District is required'),
      thana: z.string().trim().min(1, 'Thana is required'),
      coordinates: z.array(z.coerce.number()).length(2).optional(), // [longitude, latitude]
    }),
  }),
};

export const searchListingSchema = {
  query: z.object({
    q: z.string().trim().optional(),
    division: z.string().trim().optional(),
    district: z.string().trim().optional(),
    thana: z.string().trim().optional(),
    category: z.string().trim().optional(),
    subCategory: z.string().trim().optional(),
    priceMin: z.coerce.number().min(0).optional(),
    priceMax: z.coerce.number().min(0).optional(),
    condition: z.enum(['BRAND_NEW', 'LIKE_NEW', 'USED', 'FOR_PARTS']).optional(),
    verifiedOnly: z.coerce.boolean().optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'bumped']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
};

export const updateListingSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid listing ID format'),
  }),
  body: z.object({
    title: z.string().trim().min(5).max(120).optional(),
    description: z.string().trim().min(10).max(3000).optional(),
    price: z.coerce.number().min(0).optional(),
    isNegotiable: z.coerce.boolean().optional(),
    condition: z.enum(['BRAND_NEW', 'LIKE_NEW', 'USED', 'FOR_PARTS']).optional(),
    location: z
      .object({
        division: z.string().trim().optional(),
        district: z.string().trim().optional(),
        thana: z.string().trim().optional(),
        coordinates: z.array(z.coerce.number()).length(2).optional(),
      })
      .optional(),
  }),
};

export const listingIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid listing ID format'),
  }),
};

export const listingLookupParamSchema = {
  params: z.object({
    id: z.string().trim().min(1).max(180),
  }),
};

export const myListingsQuerySchema = {
  query: z.object({
    status: z.enum(['PENDING', 'ACTIVE', 'HOLD', 'SOLD', 'EXPIRED', 'REJECTED', 'SUSPENDED', 'DELETED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
};

export default {
  createListingSchema,
  searchListingSchema,
  updateListingSchema,
  listingIdParamSchema,
  listingLookupParamSchema,
  myListingsQuerySchema,
};
