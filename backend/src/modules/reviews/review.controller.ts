import { Request, Response, NextFunction } from 'express';
import { ReviewService } from './review.service';
import { sendSuccess } from '../../core/utils/response';

export class ReviewController {
  /**
   * 8.1 Submit Verified Review
   * POST /api/v1/reviews/:listingId
   */
  public static async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const buyerId = req.user!.userId;
      const { listingId } = req.params;
      const { offerId, rating, comment } = req.body;
      const traceId = (req as any).traceId || 'trace-review-sub';
      const ipAddress = req.ip;

      const result = await ReviewService.submitReview(
        buyerId,
        listingId,
        { listingId, offerId, rating, comment },
        traceId,
        ipAddress
      );

      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 8.2 Edit Review within 48-Hour Window
   * PATCH /api/v1/reviews/:id
   */
  public static async editReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const buyerId = req.user!.userId;
      const { id: reviewId } = req.params;
      const { rating, comment } = req.body;
      const traceId = (req as any).traceId || 'trace-review-edit';
      const ipAddress = req.ip;

      const result = await ReviewService.editReview(
        buyerId,
        reviewId,
        { rating, comment },
        traceId,
        ipAddress
      );

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 8.3 Seller Public Reply within 7-Day Window
   * POST /api/v1/reviews/:id/reply
   */
  public static async replyToReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = req.user!.userId;
      const { id: reviewId } = req.params;
      const { comment } = req.body;
      const traceId = (req as any).traceId || 'trace-review-reply';
      const ipAddress = req.ip;

      const result = await ReviewService.replyToReview(
        sellerId,
        reviewId,
        comment,
        traceId,
        ipAddress
      );

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 8.4 Get Public Seller Reviews
   * GET /api/v1/reviews/seller/:sellerId
   */
  public static async getSellerReviews(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { sellerId } = req.params;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await ReviewService.getSellerReviews(sellerId, page, limit);

      res.status(200).json({
        success: true,
        statusCode: 200,
        data: result.data,
        meta: result.meta,
        traceId: (req as any).traceId,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 8.5 Report Abusive Review
   * POST /api/v1/reviews/:id/report
   */
  public static async reportReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id: reviewId } = req.params;
      const { reason, details } = req.body;
      const traceId = (req as any).traceId || 'trace-review-report';
      const ipAddress = req.ip;

      const result = await ReviewService.reportReview(
        userId,
        reviewId,
        { reason, details },
        traceId,
        ipAddress
      );

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}
