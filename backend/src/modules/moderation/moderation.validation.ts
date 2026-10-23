import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const bdPhoneRegex = /^01[3-9]\d{8}$/;

export const submitReportSchema = {
  body: z.object({
    targetType: z.enum(['USER', 'LISTING', 'REVIEW'], {
      required_error: 'targetType is required (USER, LISTING, or REVIEW)',
    }),
    targetId: z
      .string({ required_error: 'targetId is required' })
      .regex(objectIdRegex, 'Invalid targetId format'),
    reason: z.enum(
      [
        'FRAUD',
        'SCAM',
        'OFFENSIVE_CONTENT',
        'FAKE_LISTING',
        'ABUSE',
        'COUNTERFEIT_ITEM',
      ],
      { required_error: 'Reason is required' }
    ),
    description: z.string().trim().max(500).optional(),
    evidenceChatRoomId: z.string().trim().optional(),
  }),
};

export const moderationQueueQuerySchema = {
  query: z.object({
    targetType: z.enum(['USER', 'LISTING', 'REVIEW']).optional(),
    reason: z
      .enum([
        'FRAUD',
        'SCAM',
        'OFFENSIVE_CONTENT',
        'FAKE_LISTING',
        'ABUSE',
        'COUNTERFEIT_ITEM',
      ])
      .optional(),
    status: z
      .enum(['SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'])
      .optional()
      .default('SUBMITTED'),
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

export const resolveReportSchema = {
  params: z.object({
    reportId: z
      .string({ required_error: 'reportId is required' })
      .regex(objectIdRegex, 'Invalid reportId format'),
  }),
  body: z.object({
    verdict: z.enum(['ACTION_TAKEN', 'DISMISSED', 'FALSE_REPORT'], {
      required_error: 'verdict is required',
    }),
    action: z.enum(
      ['SUSPEND_LISTING', 'DELETE_REVIEW', 'WARN_USER', 'BAN_USER', 'NO_ACTION'],
      { required_error: 'action is required' }
    ),
    resolutionNotes: z
      .string({ required_error: 'resolutionNotes is required' })
      .trim()
      .min(10, 'Resolution notes must be at least 10 characters')
      .max(1000, 'Resolution notes cannot exceed 1000 characters'),
    notifyReporter: z.boolean().optional().default(true),
  }),
};

export const banUserSchema = {
  body: z.object({
    userId: z
      .string({ required_error: 'userId is required' })
      .regex(objectIdRegex, 'Invalid userId format'),
    reason: z
      .string({ required_error: 'Ban reason is required' })
      .trim()
      .min(10, 'Ban reason must be at least 10 characters'),
    blacklistDevices: z.boolean().optional().default(true),
    blacklistNid: z.boolean().optional().default(true),
    suspendAllListings: z.boolean().optional().default(true),
  }),
};

export const judicialExportSchema = {
  body: z
    .object({
      warrantId: z
        .string({ required_error: 'warrantId is required' })
        .trim()
        .min(3, 'warrantId must be at least 3 characters'),
      issuingAuthority: z
        .string({ required_error: 'issuingAuthority is required' })
        .trim()
        .min(3, 'issuingAuthority must be at least 3 characters'),
      targetUserId: z.string().regex(objectIdRegex).optional(),
      targetMobileNumber: z.string().regex(bdPhoneRegex).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      exportFormat: z.enum(['JSON', 'CSV']).optional().default('JSON'),
    })
    .refine((data) => data.targetUserId || data.targetMobileNumber, {
      message: 'Either targetUserId or targetMobileNumber must be provided',
    }),
};

export const verifyChainSchema = {
  body: z.object({
    fromBlockDate: z.string().optional(),
    toBlockDate: z.string().optional(),
  }),
};
