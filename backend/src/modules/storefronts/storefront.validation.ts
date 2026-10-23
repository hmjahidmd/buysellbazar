import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const registerStorefrontSchema = {
  body: z.object({
    storeSlug: z
      .string({ required_error: 'Store slug is required' })
      .trim()
      .toLowerCase()
      .min(3, 'Slug must be at least 3 characters')
      .max(50, 'Slug cannot exceed 50 characters')
      .regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens (e.g. gadget-master-bd)'),
    brandName: z.string().trim().min(2).max(100).optional(),
    storeName: z.string().trim().min(2).max(100).optional(),
    tagline: z.string().trim().max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    logoUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
    businessCategory: z.string().trim().optional(),
    tradeLicenseNumber: z.string().trim().optional(),
    tier: z.enum(['BASIC', 'PRO', 'PLATINUM', 'ENTERPRISE']).optional().default('BASIC'),
    contact: z
      .object({
        officialPhone: z.string().trim().optional(),
        officialEmail: z.string().email().optional(),
        physicalStoreAddress: z.string().trim().max(300).optional(),
        websiteUrl: z.string().url().optional(),
      })
      .optional(),
    address: z
      .object({
        division: z.string().trim().optional(),
        district: z.string().trim().optional(),
        thana: z.string().trim().optional(),
        streetAddress: z.string().trim().optional(),
      })
      .optional(),
  }).refine((data) => !!(data.brandName || data.storeName), {
    message: 'Either brandName or storeName is required',
  }),
};

export const getStorefrontBySlugSchema = {
  params: z.object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]+$/, 'Invalid storefront slug format'),
  }),
};

export const updateStorefrontProfileSchema = {
  body: z.object({
    tagline: z.string().trim().max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    logoUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
    businessCategory: z.string().trim().optional(),
    contact: z
      .object({
        officialPhone: z.string().trim().optional(),
        officialEmail: z.string().email().optional(),
        physicalStoreAddress: z.string().trim().max(300).optional(),
        websiteUrl: z.string().url().optional(),
      })
      .optional(),
    address: z
      .object({
        division: z.string().trim().optional(),
        district: z.string().trim().optional(),
        thana: z.string().trim().optional(),
        streetAddress: z.string().trim().optional(),
      })
      .optional(),
  }),
};
