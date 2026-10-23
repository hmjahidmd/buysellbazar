import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const bdPhoneRegex = /^01[3-9]\d{8}$/;

export const initiateCheckoutSchema = {
  body: z.object({
    targetType: z.enum(['LISTING', 'STOREFRONT_SUBSCRIPTION'], {
      required_error: 'targetType is required (LISTING or STOREFRONT_SUBSCRIPTION)',
    }),
    targetId: z
      .string({ required_error: 'targetId is required' })
      .regex(objectIdRegex, 'Invalid targetId MongoDB ObjectId'),
    boostType: z.enum(
      [
        'TOP_AD_3D',
        'TOP_AD_7D',
        'TOP_AD_15D',
        'BUMP_UP',
        'STOREFRONT_TIER_BASIC',
        'STOREFRONT_TIER_PRO',
      ],
      { required_error: 'boostType is required' }
    ),
    gateway: z.enum(['BKASH', 'NAGAD', 'ROCKET', 'SSLCOMMERZ'], {
      required_error: 'Payment gateway is required (BKASH, NAGAD, ROCKET, SSLCOMMERZ)',
    }),
    customerMsisdn: z
      .string()
      .regex(bdPhoneRegex, 'customerMsisdn must be a valid 11-digit Bangladeshi number (e.g. 01712345678)')
      .optional(),
    redirectUrls: z
      .object({
        successUrl: z.string().url().optional(),
        failUrl: z.string().url().optional(),
        cancelUrl: z.string().url().optional(),
      })
      .optional(),
  }),
};

export const mfsWebhookSchema = {
  body: z.object({
    transactionRef: z.string({ required_error: 'transactionRef is required' }).trim(),
    gatewayTransactionId: z.string({ required_error: 'gatewayTransactionId is required' }).trim(),
    gateway: z.enum(['BKASH', 'NAGAD', 'ROCKET', 'SSLCOMMERZ']),
    status: z.enum(['PAID', 'FAILED', 'CANCELLED']),
    amount: z.number().positive(),
    currency: z.string().default('BDT'),
    payerMsisdn: z.string().optional(),
    paidAt: z.string().optional(),
    signature: z.string().optional(),
  }),
};

export const paymentHistoryQuerySchema = {
  query: z.object({
    status: z.enum(['INITIATED', 'PAID', 'FAILED', 'CANCELLED']).optional(),
    page: z
      .string()
      .optional()
      .default('1')
      .transform((val) => parseInt(val, 10))
      .refine((val) => val >= 1, 'Page must be >= 1'),
    limit: z
      .string()
      .optional()
      .default('15')
      .transform((val) => parseInt(val, 10))
      .refine((val) => val >= 1 && val <= 50, 'Limit must be between 1 and 50'),
  }),
};

export const paymentStatusParamSchema = {
  params: z.object({
    id: z.string({ required_error: 'Payment ID or transactionRef is required' }).trim(),
  }),
};
