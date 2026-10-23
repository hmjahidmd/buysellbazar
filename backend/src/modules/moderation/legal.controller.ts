import { Request, Response, NextFunction } from 'express';
import { WormAuditService } from './wormAudit.service';
import { sendSuccess } from '../../core/utils/response';

export class LegalController {
  /**
   * 11.5 Judicial Warrant Audit Export
   * POST /api/v1/legal/audit/export
   */
  public static async exportJudicialWarrantData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const legalOfficerId = req.user!.userId;
      const traceId = (req as any).traceId || 'trace-legal-export';
      const ipAddress = req.ip;

      const result = await WormAuditService.exportJudicialWarrantData(
        legalOfficerId,
        req.body,
        traceId,
        ipAddress
      );

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 11.6 Verify Cryptographic WORM Chain Integrity
   * POST /api/v1/legal/audit/verify-chain
   */
  public static async verifyAuditChainIntegrity(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { fromBlockDate, toBlockDate } = req.body;

      const result = await WormAuditService.verifyAuditChainIntegrity(
        fromBlockDate,
        toBlockDate
      );

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}
