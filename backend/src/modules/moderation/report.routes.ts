import { Router } from 'express';
import { ModerationController } from './moderation.controller';
import { submitReportSchema } from './moderation.validation';
import { requireAuth } from '../../core/middlewares/authGuards';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { createRateLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

const reportLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5,
  keyPrefix: 'rl_report_submit',
});

// 11.1 Submit Abuse or Fraud Report: POST /api/v1/reports
router.post(
  '/',
  requireAuth,
  reportLimiter,
  validateRequest(submitReportSchema),
  ModerationController.submitReport
);

export default router;
