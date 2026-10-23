import { Request, Response, NextFunction } from 'express';
import { KycService } from './kyc.service';
import { sendSuccess } from '../../../core/utils/response';

export class KycController {
  /**
   * 3.1 Upload Dual-Sided NID Documents
   */
  public static async uploadNid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const nidFrontBuffer = files?.nidFront?.[0]?.buffer;
      const nidBackBuffer = files?.nidBack?.[0]?.buffer;

      const result = await KycService.uploadNid({
        userId,
        nidFrontBuffer,
        nidBackBuffer,
        clientIp,
        traceId: req.traceId,
        userAgent,
      });

      sendSuccess(res, result, 200, 'NID documents analyzed. OCR extraction complete.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3.2 Verify Biometric 3D Liveness
   */
  public static async verifyLiveness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { kycSessionId, mockConfidenceScore } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const selfieBuffer = files?.selfie?.[0]?.buffer;

      const result = await KycService.verifyLiveness({
        userId,
        kycSessionId,
        selfieBuffer,
        mockConfidenceScore: mockConfidenceScore ? Number(mockConfidenceScore) : undefined,
        clientIp,
        traceId: req.traceId,
        userAgent,
      });

      sendSuccess(res, result, 200, 'Biometric liveness verification processed.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3.3 Get KYC Verification Status
   */
  public static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await KycService.getKycStatus(userId);

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3.4 Moderator Manual KYC Review
   */
  public static async adminReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const moderatorId = req.user!.userId;
      const { userId: targetUserId } = req.params;
      const { decision, reviewNotes } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await KycService.adminManualReview({
        moderatorId,
        targetUserId,
        decision,
        reviewNotes,
        traceId: req.traceId,
        clientIp,
      });

      sendSuccess(res, result, 200, 'KYC manual review decision recorded successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3.5 One-step e-KYC Verification & Blue Shield Unlock
   */
  public static async completeKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { selfieImageBase64 } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      const result = await KycService.completeKycDirect({
        userId,
        selfieImageBase64,
        clientIp,
        traceId: req.traceId,
        userAgent,
      });

      sendSuccess(res, result, 200, 'Identity verified successfully! Blue Shield badge unlocked.');
    } catch (error) {
      next(error);
    }
  }
}

export default KycController;
