import { Router } from 'express';
import multer from 'multer';
import { KycController } from './kyc.controller';
import { verifyLivenessSchema, adminKycReviewSchema } from './kyc.validation';
import { requireAuth, requireRole } from '../../../core/middlewares/authGuards';
import { validateRequest } from '../../../core/middlewares/validateRequest';
import { createRateLimiter } from '../../../core/middlewares/rateLimiter';

const router = Router();

// Memory upload buffer configuration for secure KYC image processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
  },
});

const kycRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  keyPrefix: 'rl_kyc',
});

// 3.1 Upload Dual-Sided NID Documents
router.post(
  '/upload-nid',
  requireAuth,
  kycRateLimiter,
  upload.fields([
    { name: 'nidFront', maxCount: 1 },
    { name: 'nidBack', maxCount: 1 },
  ]),
  KycController.uploadNid
);

// 3.2 Verify Biometric 3D Liveness
router.post(
  '/verify-liveness',
  requireAuth,
  kycRateLimiter,
  upload.fields([{ name: 'selfie', maxCount: 1 }]),
  validateRequest(verifyLivenessSchema),
  KycController.verifyLiveness
);

// 3.3 Get KYC Verification Status
router.get(
  '/status',
  requireAuth,
  KycController.getStatus
);

// 3.4 Moderator Manual KYC Review
router.post(
  '/admin/review/:userId',
  requireAuth,
  requireRole(['moderator', 'admin']),
  validateRequest(adminKycReviewSchema),
  KycController.adminReview
);

// 3.5 Direct e-KYC Verification & Blue Shield Unlock
router.post(
  '/complete-kyc',
  requireAuth,
  KycController.completeKyc
);

router.post(
  '/liveness',
  requireAuth,
  KycController.completeKyc
);

export default router;
