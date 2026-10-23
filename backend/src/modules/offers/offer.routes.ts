import { Router } from 'express';
import { OfferController } from './offer.controller';
import {
  submitOfferSchema,
  offerIdParamSchema,
  counterOfferSchema,
  declineOfferSchema,
  offersQuerySchema,
} from './offer.validation';
import { requireAuth, requireNidVerified } from '../../core/middlewares/authGuards';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { createRateLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

const offerRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyPrefix: 'rl_offers',
});

// 6.6 List Received Offers (Must precede dynamic :id routes)
router.get(
  '/received',
  requireAuth,
  validateRequest(offersQuerySchema),
  OfferController.getReceived
);

// 6.7 List Sent Offers (Must precede dynamic :id routes)
router.get(
  '/sent',
  requireAuth,
  validateRequest(offersQuerySchema),
  OfferController.getSent
);

// 6.1 Submit Binding Price Offer (Protected + NID Verified)
router.post(
  '/:listingId',
  requireAuth,
  requireNidVerified,
  offerRateLimiter,
  validateRequest(submitOfferSchema),
  OfferController.submit
);

// 6.2 Accept Offer (Multi-Document ACID Transaction)
router.post(
  '/:id/accept',
  requireAuth,
  validateRequest(offerIdParamSchema),
  OfferController.accept
);

// 6.3 Propose Counter-Offer
router.post(
  '/:id/counter',
  requireAuth,
  validateRequest(counterOfferSchema),
  OfferController.counter
);

// 6.4 Decline Offer
router.post(
  '/:id/decline',
  requireAuth,
  validateRequest(declineOfferSchema),
  OfferController.decline
);

// 6.5 Withdraw Offer
router.post(
  '/:id/withdraw',
  requireAuth,
  validateRequest(offerIdParamSchema),
  OfferController.withdraw
);

export default router;
