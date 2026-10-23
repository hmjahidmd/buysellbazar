import { Router } from 'express';
import { ReviewController } from './review.controller';
import {
  submitReviewSchema,
  editReviewSchema,
  replyToReviewSchema,
  getSellerReviewsSchema,
  reportReviewSchema,
} from './review.validation';
import { requireAuth, requireNidVerified } from '../../core/middlewares/authGuards';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { createRateLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

const reviewSubmitLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'rl_review_submit',
});

const reviewReportLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'rl_review_report',
});

// 8.1 Submit Verified Review
router.post(
  '/:listingId',
  requireAuth,
  requireNidVerified,
  reviewSubmitLimiter,
  validateRequest(submitReviewSchema),
  ReviewController.submitReview
);

// 8.2 Edit Review within 48-Hour Window
router.patch(
  '/:id',
  requireAuth,
  validateRequest(editReviewSchema),
  ReviewController.editReview
);

// 8.3 Seller Public Reply within 7-Day Window
router.post(
  '/:id/reply',
  requireAuth,
  validateRequest(replyToReviewSchema),
  ReviewController.replyToReview
);

// 8.4 Get Public Seller Reviews
router.get(
  '/seller/:sellerId',
  validateRequest(getSellerReviewsSchema),
  ReviewController.getSellerReviews
);

// 8.5 Report Abusive Review
router.post(
  '/:id/report',
  requireAuth,
  reviewReportLimiter,
  validateRequest(reportReviewSchema),
  ReviewController.reportReview
);

export default router;
