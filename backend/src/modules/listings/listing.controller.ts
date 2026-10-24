import { Request, Response, NextFunction } from 'express';
import { ListingService } from './listing.service';
import { sendSuccess } from '../../core/utils/response';

export class ListingController {
  /**
   * 5.1 Create Free Ad Listing
   */
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const files = req.files as Express.Multer.File[] | undefined;

      // Handle JSON body or parsed multipart form body
      let data = req.body;
      if (typeof req.body.location === 'string') {
        try {
          data.location = JSON.parse(req.body.location);
        } catch (e) {
          // Keep as is if parsing fails
        }
      }

      const listing = await ListingService.createListing({
        userId,
        data,
        imageFiles: files,
        clientIp,
        traceId: req.traceId,
      });

      sendSuccess(res, listing, 201, 'Listing submitted for review.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5.2 Multi-Parametric Geo & Faceted Search
   */
  public static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const results = await ListingService.searchListings(req.query as any);
      sendSuccess(res, results, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5.3 Get Single Listing Details
   */
  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const listing = await ListingService.getListingDetails(id, clientIp);
      sendSuccess(res, listing, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5.4 Update Listing Details
   */
  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const updated = await ListingService.updateListing(userId, id, req.body);
      sendSuccess(res, updated, 200, 'Listing updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5.5 Mark Listing as Sold
   */
  public static async markSold(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await ListingService.markSold(userId, id, req.traceId, clientIp);
      sendSuccess(res, result, 200, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5.6 Renew Expired Listing
   */
  public static async renew(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await ListingService.renewListing(userId, id);
      sendSuccess(res, result, 200, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5.7 Soft-Delete Listing
   */
  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await ListingService.deleteListing(userId, id, req.traceId, clientIp);
      sendSuccess(res, result, 200, 'Listing deleted successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5.8 Get Seller's My Listings Dashboard
   */
  public static async getMyListings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const status = req.query.status as string | undefined;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await ListingService.getMyListings(userId, status, page, limit);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

export default ListingController;
