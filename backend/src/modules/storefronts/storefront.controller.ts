import { Request, Response, NextFunction } from 'express';
import { StorefrontService } from './storefront.service';
import { sendSuccess } from '../../core/utils/response';

export class StorefrontController {
  /**
   * 9.1 Register Commercial Storefront
   * POST /api/v1/storefronts
   */
  public static async registerStorefront(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const merchantId = req.user!.userId;
      const traceId = (req as any).traceId || 'trace-store-reg';
      const ipAddress = req.ip;

      const result = await StorefrontService.registerStorefront(
        merchantId,
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
   * 9.2 Get Storefront by Vanity Slug
   * GET /api/v1/storefronts/:slug
   */
  public static async getStorefrontBySlug(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { slug } = req.params;

      const result = await StorefrontService.getStorefrontBySlug(slug);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 9.3 Update Merchant Storefront Profile
   * PATCH /api/v1/storefronts/me
   */
  public static async updateStorefrontProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const merchantId = req.user!.userId;
      const traceId = (req as any).traceId || 'trace-store-upd';
      const ipAddress = req.ip;

      const result = await StorefrontService.updateStorefrontProfile(
        merchantId,
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
   * 9.4 Get Merchant Performance Analytics Dashboard
   * GET /api/v1/storefronts/me/analytics
   */
  public static async getMerchantAnalytics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const merchantId = req.user!.userId;

      const result = await StorefrontService.getMerchantAnalytics(merchantId);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}
