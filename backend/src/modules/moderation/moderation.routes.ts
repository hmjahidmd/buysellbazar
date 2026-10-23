import { Router } from 'express';
import { ModerationController } from './moderation.controller';
import {
  moderationQueueQuerySchema,
  resolveReportSchema,
  banUserSchema,
} from './moderation.validation';
import { requireAuth, requireRole } from '../../core/middlewares/authGuards';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { createRateLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

const modActionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyPrefix: 'rl_mod_action',
});

// 11.2 Admin / Moderator Get Moderation Queue: GET /api/v1/admin/moderation/queue
router.get(
  '/queue',
  requireAuth,
  requireRole(['moderator', 'admin']),
  validateRequest(moderationQueueQuerySchema),
  ModerationController.getModerationQueue
);

// 11.3 Admin Resolve Moderation Ticket: POST /api/v1/admin/moderation/resolve-report/:reportId
router.post(
  '/resolve-report/:reportId',
  requireAuth,
  requireRole(['moderator', 'admin']),
  modActionLimiter,
  validateRequest(resolveReportSchema),
  ModerationController.resolveReport
);

// 11.4 Admin Enforce Permanent User / Device Ban: POST /api/v1/admin/moderation/ban-user
router.post(
  '/ban-user',
  requireAuth,
  requireRole(['admin']),
  modActionLimiter,
  validateRequest(banUserSchema),
  ModerationController.banUser
);

export default router;
