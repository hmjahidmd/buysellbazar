import { Router } from 'express';
import { AuthController } from './auth.controller';
import {
  requestOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  revokeSessionSchema,
} from './auth.validation';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { requireAuth } from '../../core/middlewares/authGuards';
import { createRateLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

// Rate limiters for authentication endpoints
const otpRequestLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
  keyPrefix: 'rl_auth_otp',
});

const otpVerifyLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'rl_auth_verify',
});

// 2.1 Request OTP Challenge
router.post(
  '/request-otp',
  otpRequestLimiter,
  validateRequest(requestOtpSchema),
  AuthController.requestOtp
);

// 2.2 Verify OTP & Issue Token Pair
router.post(
  '/verify-otp',
  otpVerifyLimiter,
  validateRequest(verifyOtpSchema),
  AuthController.verifyOtp
);

// 2.3 Rotate Refresh Token
router.post(
  '/refresh',
  validateRequest(refreshTokenSchema),
  AuthController.refreshToken
);

// 2.4 Logout & Revoke Session
router.post(
  '/logout',
  requireAuth,
  AuthController.logout
);

// 2.5 List Bound Device Sessions
router.get(
  '/sessions',
  requireAuth,
  AuthController.getSessions
);

// 2.6 Revoke Remote Device Session
router.delete(
  '/sessions/:deviceId',
  requireAuth,
  validateRequest(revokeSessionSchema),
  AuthController.revokeSession
);

export default router;
