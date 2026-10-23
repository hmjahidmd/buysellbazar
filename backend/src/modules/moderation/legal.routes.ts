import { Router } from 'express';
import { LegalController } from './legal.controller';
import { judicialExportSchema, verifyChainSchema } from './moderation.validation';
import { requireAuth, requireRole } from '../../core/middlewares/authGuards';
import { validateRequest } from '../../core/middlewares/validateRequest';
import { createRateLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

const legalExportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  keyPrefix: 'rl_legal_export',
});

const chainVerifyLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  keyPrefix: 'rl_chain_verify',
});

// 11.5 Judicial Warrant Audit Export: POST /api/v1/legal/audit/export
router.post(
  '/audit/export',
  requireAuth,
  requireRole(['legal_officer', 'admin']),
  legalExportLimiter,
  validateRequest(judicialExportSchema),
  LegalController.exportJudicialWarrantData
);

// 11.6 Verify Cryptographic WORM Chain Integrity: POST /api/v1/legal/audit/verify-chain
router.post(
  '/audit/verify-chain',
  requireAuth,
  requireRole(['legal_officer', 'admin']),
  chainVerifyLimiter,
  validateRequest(verifyChainSchema),
  LegalController.verifyAuditChainIntegrity
);

export default router;
