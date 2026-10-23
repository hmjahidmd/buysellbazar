import { Router } from 'express';
import { PaymentController } from './payment.controller';
import {
  initiateCheckoutSchema,
  mfsWebhookSchema,
  paymentHistoryQuerySchema,
  paymentStatusParamSchema,
} from './payment.validation';
import { requireAuth } from '../../core/middlewares/authGuards';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { createRateLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

const checkoutLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'rl_checkout',
});

const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  keyPrefix: 'rl_mfs_ipn',
});

const pollingLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: 'rl_payment_status',
});

// 10.1 Initiate Boost Checkout Order (Alias for /api/v1/payments/checkout)
router.post(
  '/checkout',
  requireAuth,
  checkoutLimiter,
  validateRequest(initiateCheckoutSchema),
  PaymentController.initiateCheckout
);

// 10.2 Payment Gateway IPN / Webhook Callback (Public, secured by HMAC-SHA256)
router.post(
  '/mfs-callback',
  webhookLimiter,
  validateRequest(mfsWebhookSchema),
  PaymentController.handleMfsWebhook
);

// 10.3 Get User Payment & Transaction History (Declared before :id to prevent collision)
router.get(
  '/history',
  requireAuth,
  validateRequest(paymentHistoryQuerySchema),
  PaymentController.getPaymentHistory
);

// 10.4 Query Specific Payment Status
router.get(
  '/:id/status',
  requireAuth,
  pollingLimiter,
  validateRequest(paymentStatusParamSchema),
  PaymentController.getPaymentStatus
);

export default router;
