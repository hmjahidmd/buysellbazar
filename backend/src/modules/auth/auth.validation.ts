import { z } from 'zod';

export const requestOtpSchema = {
  body: z.object({
    mobileNumber: z
      .string()
      .trim()
      .regex(/^01[3-9]\d{8}$/, 'Must be a valid 11-digit Bangladeshi mobile number starting with 01'),
  }),
};

export const verifyOtpSchema = {
  body: z.object({
    mobileNumber: z
      .string()
      .trim()
      .regex(/^01[3-9]\d{8}$/, 'Must be a valid 11-digit Bangladeshi mobile number'),
    otp: z
      .string()
      .trim()
      .length(6, 'OTP must be exactly 6 digits')
      .regex(/^\d{6}$/, 'OTP must contain numbers only'),
    deviceFingerprintHash: z
      .string()
      .trim()
      .min(8, 'deviceFingerprintHash must be at least 8 characters')
      .max(128),
    deviceModel: z.string().trim().max(100).optional(),
  }),
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().optional(),
  }),
};

export const revokeSessionSchema = {
  params: z.object({
    deviceId: z.string().min(1, 'deviceId is required'),
  }),
};

export default {
  requestOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  revokeSessionSchema,
};
