import { Request, Response, NextFunction } from 'express';
import { OfferService } from './offer.service';
import { sendSuccess } from '../../core/utils/response';

export class OfferController {
  /**
   * 6.1 Submit Binding Price Offer
   */
  public static async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const buyerId = req.user!.userId;
      const { listingId } = req.params;
      const { offeredPrice } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const offer = await OfferService.submitOffer({
        buyerId,
        listingId,
        offeredPrice: Number(offeredPrice),
        clientIp,
        traceId: req.traceId,
      });

      sendSuccess(res, offer, 201, 'Binding price offer submitted to seller.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6.2 Accept Offer (Multi-Document ACID Transaction)
   */
  public static async accept(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = req.user!.userId;
      const { id } = req.params;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await OfferService.acceptOffer({
        sellerId,
        offerId: id,
        clientIp,
        traceId: req.traceId,
      });

      sendSuccess(res, result, 200, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6.3 Propose Counter-Offer
   */
  public static async counter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = req.user!.userId;
      const { id } = req.params;
      const { counterPrice } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const offer = await OfferService.counterOffer({
        sellerId,
        offerId: id,
        counterPrice: Number(counterPrice),
        clientIp,
        traceId: req.traceId,
      });

      sendSuccess(res, offer, 200, 'Counter-offer proposed successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6.4 Decline Offer
   */
  public static async decline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = req.user!.userId;
      const { id } = req.params;
      const { reason } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await OfferService.declineOffer({
        sellerId,
        offerId: id,
        reason,
        clientIp,
        traceId: req.traceId,
      });

      sendSuccess(res, result, 200, 'Offer declined.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6.5 Withdraw Offer
   */
  public static async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const buyerId = req.user!.userId;
      const { id } = req.params;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await OfferService.withdrawOffer({
        buyerId,
        offerId: id,
        clientIp,
        traceId: req.traceId,
      });

      sendSuccess(res, result, 200, 'Offer withdrawn successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6.6 List Received Offers (for Seller)
   */
  public static async getReceived(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = req.user!.userId;
      const { listingId, status, page, limit } = req.query;

      const result = await OfferService.getReceivedOffers({
        sellerId,
        listingId: listingId as string,
        status: status as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6.7 List Sent Offers (for Buyer)
   */
  public static async getSent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const buyerId = req.user!.userId;
      const { status, page, limit } = req.query;

      const result = await OfferService.getSentOffers({
        buyerId,
        status: status as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export default OfferController;
