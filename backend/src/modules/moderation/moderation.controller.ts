import { Request, Response, NextFunction } from 'express';
import { ModerationService } from './moderation.service';
import { ListingService } from '../listings/listing.service';
import { sendSuccess } from '../../core/utils/response';

export class ModerationController {
  public static async getAdminListings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ListingService.getAdminListings(
        { q: req.query.q as string | undefined, status: req.query.status as string | undefined },
        req.query.page ? Number(req.query.page) : 1,
        req.query.limit ? Number(req.query.limit) : 20
      );
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  public static async adminDeleteListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ListingService.adminDeleteListing(
        req.user!.userId,
        req.params.listingId,
        req.traceId,
        req.ip
      );
      sendSuccess(res, result, 200, 'Listing deleted.');
    } catch (error) {
      next(error);
    }
  }

  public static async getListingReviewQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      sendSuccess(res, await ListingService.getPendingReviewListings(page, limit), 200);
    } catch (error) {
      next(error);
    }
  }

  public static async reviewListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ListingService.reviewListing(
        req.user!.userId,
        req.params.listingId,
        req.body.action,
        req.traceId,
        req.ip
      );
      sendSuccess(res, result, 200, `Listing ${result.status.toLowerCase()}.`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 11.1 Submit Abuse or Fraud Report
   * POST /api/v1/reports
   */
  public static async submitReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const reporterId = req.user!.userId;
      const traceId = (req as any).traceId || 'trace-report-sub';
      const ipAddress = req.ip;

      const result = await ModerationService.submitReport(
        reporterId,
        req.body,
        traceId,
        ipAddress
      );

      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 11.2 Admin / Moderator Get Moderation Queue
   * GET /api/v1/admin/moderation/queue
   */
  public static async getModerationQueue(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { targetType, reason, status, page, limit } = req.query as any;

      const result = await ModerationService.getModerationQueue(
        { targetType, reason, status },
        page ? Number(page) : 1,
        limit ? Number(limit) : 20
      );

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 11.3 Admin Resolve Moderation Ticket
   * POST /api/v1/admin/moderation/resolve-report/:reportId
   */
  public static async resolveReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const moderatorId = req.user!.userId;
      const { reportId } = req.params;
      const traceId = (req as any).traceId || 'trace-report-resolve';
      const ipAddress = req.ip;

      const result = await ModerationService.resolveReport(
        moderatorId,
        reportId,
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
   * 11.4 Admin Enforce Permanent User / Device Ban
   * POST /api/v1/admin/moderation/ban-user
   */
  public static async banUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const traceId = (req as any).traceId || 'trace-ban-user';
      const ipAddress = req.ip;

      const result = await ModerationService.banUserAndDevices(
        adminId,
        req.body,
        traceId,
        ipAddress
      );

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}
