import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { initiateCheckoutSchema } from './payment.validation';
import { requireAuth } from '../../core/middlewares/authGuards';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { createRateLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

const checkoutLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'rl_boost_checkout',
});

// 10.1 Initiate Boost Checkout Order: POST /api/v1/boosts/checkout
router.post(
  '/checkout',
  requireAuth,
  checkoutLimiter,
  validateRequest(initiateCheckoutSchema),
  PaymentController.initiateCheckout
);

export default router;
