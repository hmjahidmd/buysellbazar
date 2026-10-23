import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';
import { sendSuccess } from '../../core/utils/response';

export class PaymentController {
  /**
   * 10.1 Initiate Boost Checkout Order
   * POST /api/v1/boosts/checkout
   */
  public static async initiateCheckout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const traceId = (req as any).traceId || 'trace-boost-checkout';
      const ipAddress = req.ip;

      const result = await PaymentService.initiateCheckout(
        userId,
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
   * 10.2 Payment Gateway IPN / Webhook Callback
   * POST /api/v1/payments/mfs-callback
   */
  public static async handleMfsWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const signatureHeader =
        (req.headers['x-gateway-signature'] as string) || req.body.signature;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      const traceId = (req as any).traceId || 'trace-mfs-webhook';

      const result = await PaymentService.handleMfsWebhook(
        req.body,
        signatureHeader,
        rawBody,
        traceId
      );

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 10.3 Get User Payment & Transaction History
   * GET /api/v1/payments/history
   */
  public static async getPaymentHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { status, page, limit } = req.query as any;

      const result = await PaymentService.getPaymentHistory(
        userId,
        status,
        page ? Number(page) : 1,
        limit ? Number(limit) : 15
      );

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 10.4 Query Specific Payment Status
   * GET /api/v1/payments/:id/status
   */
  public static async getPaymentStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await PaymentService.getPaymentStatus(userId, id);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}
