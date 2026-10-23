import { Router } from 'express';
import { UserController } from './user.controller';
import {
  updateProfileSchema,
  publicProfileSchema,
  savedListingSchema,
  listSavedListingsSchema,
} from './user.validation';
import { requireAuth } from '../../core/middlewares/authGuards';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { createRateLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

const profileRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyPrefix: 'rl_users',
});

// 4.1 Get Authenticated User Profile
router.get(
  '/me',
  requireAuth,
  profileRateLimiter,
  UserController.getSelf
);

// 4.2 Update User Profile & Privacy Settings
router.patch(
  '/me',
  requireAuth,
  profileRateLimiter,
  validateRequest(updateProfileSchema),
  UserController.updateSelf
);

// 4.3 Check Daily Free Ad Quota Status
router.get(
  '/me/quota',
  requireAuth,
  profileRateLimiter,
  UserController.getQuota
);

// 4.4 Get Public Seller Profile & Feedback
router.get(
  '/:id/public-profile',
  profileRateLimiter,
  validateRequest(publicProfileSchema),
  UserController.getPublic
);

// 4.5 Save / Bookmark a Listing
router.post(
  '/me/saved-listings/:listingId',
  requireAuth,
  validateRequest(savedListingSchema),
  UserController.toggleSaved
);

// 4.6 List User's Saved Bookmarks
router.get(
  '/me/saved-listings',
  requireAuth,
  validateRequest(listSavedListingsSchema),
  UserController.getSaved
);

export default router;
