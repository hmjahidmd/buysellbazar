import { Router } from 'express';
import multer from 'multer';
import { ListingController } from './listing.controller';
import {
  searchListingSchema,
  updateListingSchema,
  listingIdParamSchema,
  listingLookupParamSchema,
  myListingsQuerySchema,
} from './listing.validation';
import { requireAuth, requireNidVerified } from '../../core/middlewares/authGuards';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { createRateLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

// Memory upload buffer configuration for processing images with Sharp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
    files: 10,
  },
});

const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  keyPrefix: 'rl_listings_search',
});

const postAdRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  keyPrefix: 'rl_listings_post',
});

// 5.2 Multi-Parametric Geo & Faceted Search (Public)
router.get(
  '/search',
  searchRateLimiter,
  validateRequest(searchListingSchema),
  ListingController.search
);

// 5.8 Get Seller's My Listings Dashboard (Protected)
router.get(
  '/my-listings',
  requireAuth,
  validateRequest(myListingsQuerySchema),
  ListingController.getMyListings
);

// 5.1 Create Free Ad Listing (Protected + NID Verified)
router.post(
  '/',
  requireAuth,
  requireNidVerified,
  postAdRateLimiter,
  upload.array('images', 10),
  ListingController.create
);

// 5.3 Get Single Listing Details (Public)
router.get(
  '/:id',
  validateRequest(listingLookupParamSchema),
  ListingController.getById
);

// 5.4 Update Listing Details (Protected)
router.patch(
  '/:id',
  requireAuth,
  validateRequest(updateListingSchema),
  ListingController.update
);

// 5.5 Mark Listing as Sold (Protected)
router.post(
  '/:id/mark-sold',
  requireAuth,
  validateRequest(listingIdParamSchema),
  ListingController.markSold
);

// 5.6 Renew Expired Listing (Protected)
router.post(
  '/:id/renew',
  requireAuth,
  validateRequest(listingIdParamSchema),
  ListingController.renew
);

// 5.7 Soft-Delete Listing (Protected)
router.delete(
  '/:id',
  requireAuth,
  validateRequest(listingIdParamSchema),
  ListingController.delete
);

export default router;
