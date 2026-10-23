import { Router } from 'express';
import { StorefrontController } from './storefront.controller';
import {
  registerStorefrontSchema,
  getStorefrontBySlugSchema,
  updateStorefrontProfileSchema,
} from './storefront.validation';
import { requireAuth, requireNidVerified } from '../../core/middlewares/authGuards';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { createRateLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

const storefrontRegisterLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 5,
  keyPrefix: 'rl_storefront_reg',
});

// 9.1 Register Commercial Storefront (Protected + NID Verified)
router.post(
  '/',
  requireAuth,
  requireNidVerified,
  storefrontRegisterLimiter,
  validateRequest(registerStorefrontSchema),
  StorefrontController.registerStorefront
);

// 9.3 Update Merchant Storefront Profile (Declared before :slug to prevent route shadowing)
router.patch(
  '/me',
  requireAuth,
  validateRequest(updateStorefrontProfileSchema),
  StorefrontController.updateStorefrontProfile
);

// 9.4 Get Merchant Performance Analytics Dashboard
router.get(
  '/me/analytics',
  requireAuth,
  StorefrontController.getMerchantAnalytics
);

// 9.2 Get Storefront by Vanity Slug (Public)
router.get(
  '/:slug',
  validateRequest(getStorefrontBySlugSchema),
  StorefrontController.getStorefrontBySlug
);

export default router;
