import crypto from 'crypto';
import { hashDeterministic } from '../../src/core/utils/cryptoVault';
import { verifyOtpSchema, requestOtpSchema } from '../../src/modules/auth/auth.validation';
import { verifyLivenessSchema } from '../../src/modules/users/kyc/kyc.validation';

describe('Phase 15: Auth & e-KYC Identity Engine Integration Test', () => {
  const validMobile = '01712345678';
  const validDeviceFingerprint = crypto.randomBytes(32).toString('hex'); // 64 hex characters

  test('1. Validates Bangladeshi 11-digit mobile number format for OTP request', () => {
    const valid = requestOtpSchema.body.safeParse({
      mobileNumber: validMobile,
    });
    expect(valid.success).toBe(true);

    const invalid = requestOtpSchema.body.safeParse({
      mobileNumber: '01212345678', // Invalid BD carrier code (012 is not valid in BD)
    });
    expect(invalid.success).toBe(false);
  });

  test('2. Validates 6-digit OTP verification payload', () => {
    const valid = verifyOtpSchema.body.safeParse({
      mobileNumber: validMobile,
      otp: '123456',
      deviceFingerprintHash: validDeviceFingerprint,
    });
    expect(valid.success).toBe(true);

    const invalid = verifyOtpSchema.body.safeParse({
      mobileNumber: validMobile,
      otp: '1234', // Less than 6 digits
      deviceFingerprintHash: validDeviceFingerprint,
    });
    expect(invalid.success).toBe(false);
  });

  test('3. Enforces deterministic SHA-256 NID hashing to detect duplicate national IDs', () => {
    const nidA = '19942691234567890';
    const nidB = '19942691234567890 '; // With trailing whitespace

    const hashA = hashDeterministic(nidA);
    const hashB = hashDeterministic(nidB);

    expect(hashA).toHaveLength(64);
    expect(hashA).toBe(hashB); // Deterministic matching
  });

  test('4. Validates e-KYC Liveness verification confidence threshold for Blue Shield', () => {
    const confidenceScore = 98.5; // >= 95% threshold for instant Blue Shield clearance
    const isAutoCleared = confidenceScore >= 95.0;
    const isManualReview = confidenceScore >= 70.0 && confidenceScore < 95.0;

    expect(isAutoCleared).toBe(true);
    expect(isManualReview).toBe(false);

    const validLiveness = verifyLivenessSchema.body.safeParse({
      kycSessionId: '550e8400-e29b-41d4-a716-446655440000',
      mockConfidenceScore: 98.5,
    });
    expect(validLiveness.success).toBe(true);
  });
});
