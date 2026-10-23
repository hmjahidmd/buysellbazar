import crypto from 'crypto';
import { Types } from 'mongoose';
import { Review, IReviewDocument } from './review.model';
import { Offer } from '../offers/offer.model';
import { User } from '../users/user.model';
import { Notification } from '../notifications/notification.model';
import { AuditLog, computeAuditHash } from '../moderation/auditLog.model';
import logger from '../../config/logger';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../../core/errors/AppError';

export interface SubmitReviewDto {
  listingId: string;
  offerId: string;
  rating: number;
  comment: string;
}

export interface EditReviewDto {
  rating?: number;
  comment?: string;
}

export interface ReportReviewDto {
  reason: string;
  details?: string;
}

export class ReviewService {
  private static async logAuditEvent(params: {
    traceId: string;
    userId: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const lastLog = await AuditLog.findOne().sort({ createdAt: -1 }).select('currentHash');
      const previousHash = lastLog
        ? lastLog.currentHash
        : crypto.createHash('sha256').update('BUYSELL_BD_GENESIS_BLOCK').digest('hex');

      const timestamp = new Date();
      const currentHash = computeAuditHash(previousHash, {
        traceId: params.traceId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata,
        timestamp,
      });

      await AuditLog.create({
        traceId: params.traceId,
        userId: new Types.ObjectId(params.userId),
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        previousHash,
        currentHash,
        metadata: params.metadata,
        createdAt: timestamp,
      });
    } catch (err) {
      logger.error('Failed to write WORM audit log in ReviewService:', err);
    }
  }

  private static async recalculateSellerScore(sellerId: Types.ObjectId): Promise<{
    ratingAverage: number;
    ratingCount: number;
  }> {
    const stats = await Review.aggregate([
      {
        $match: {
          sellerId,
          moderationStatus: { $ne: 'REMOVED' },
        },
      },
      {
        $group: {
          _id: '$sellerId',
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const ratingAverage = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
    const ratingCount = stats.length > 0 ? stats[0].totalReviews : 0;

    await User.findByIdAndUpdate(sellerId, {
      ratingAverage,
      ratingCount,
    });

    return { ratingAverage, ratingCount };
  }

  public static async submitReview(
    buyerId: string,
    listingId: string,
    dto: SubmitReviewDto,
    traceId: string,
    ipAddress?: string
  ) {
    const offer = await Offer.findById(dto.offerId);
    if (!offer) {
      throw new NotFoundError('Associated offer record not found.', 'OFFER_NOT_FOUND');
    }

    // 1. Enforce verified buyer and transaction match
    if (
      offer.buyerId.toString() !== buyerId ||
      offer.listingId.toString() !== listingId ||
      offer.status !== 'ACCEPTED'
    ) {
      throw new ForbiddenError(
        'Transaction not marked as accepted, or user is not the verified buyer.',
        'ERR_REVIEW_UNAUTHORIZED'
      );
    }

    // 2. Check duplicate review for this accepted transaction
    const existingReview = await Review.findOne({ offerId: offer._id });
    if (existingReview) {
      throw new ConflictError(
        'Review already submitted for this transaction.',
        'ERR_REVIEW_ALREADY_EXISTS'
      );
    }

    // 3. Check 30-day post-transaction completion SLA
    const completionDate = offer.updatedAt || offer.createdAt;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (completionDate < thirtyDaysAgo) {
      throw new BadRequestError(
        'Review submission period has expired (must be within 30 days of transaction completion).',
        'ERR_REVIEW_WINDOW_EXPIRED'
      );
    }

    // 4. Create review with 48-hour editing window
    const editExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const review = await Review.create({
      offerId: offer._id,
      listingId: offer.listingId,
      buyerId: offer.buyerId,
      sellerId: offer.sellerId,
      rating: dto.rating,
      comment: dto.comment,
      editExpiresAt,
    });

    // 5. Atomic recalculation of seller reputation score
    const { ratingAverage } = await this.recalculateSellerScore(offer.sellerId);

    // 6. Push notification to seller
    try {
      await Notification.create({
        recipientId: offer.sellerId,
        type: 'REVIEW_RECEIVED',
        title: 'New Review Received',
        body: `A verified buyer left a ${dto.rating}-star review on your listing.`,
        entityType: 'Review',
        entityId: review._id,
      });
    } catch (notifErr) {
      logger.error('Failed to create review notification:', notifErr);
    }

    // 7. Cryptographic WORM audit log
    await this.logAuditEvent({
      traceId,
      userId: buyerId,
      actorRole: 'BUYER',
      action: 'REVIEW_SUBMITTED',
      entityType: 'Review',
      entityId: review._id.toString(),
      ipAddress,
      metadata: {
        listingId,
        offerId: dto.offerId,
        sellerId: offer.sellerId.toString(),
        rating: dto.rating,
      },
    });

    return {
      reviewId: review._id,
      rating: review.rating,
      sellerNewAverageScore: ratingAverage,
      buyerEditableUntil: review.editExpiresAt,
      message: 'Review submitted successfully! You may edit this feedback within 48 hours.',
    };
  }

  public static async editReview(
    buyerId: string,
    reviewId: string,
    dto: EditReviewDto,
    traceId: string,
    ipAddress?: string
  ) {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found.', 'REVIEW_NOT_FOUND');
    }

    if (review.buyerId.toString() !== buyerId) {
      throw new ForbiddenError(
        'Unauthorized: You are not the author of this review.',
        'ERR_REVIEW_UNAUTHORIZED'
      );
    }

    if (new Date() > review.editExpiresAt) {
      throw new ForbiddenError(
        '48-hour editing window has elapsed.',
        'ERR_REVIEW_WINDOW_CLOSED'
      );
    }

    if (dto.rating !== undefined) {
      review.rating = dto.rating;
    }
    if (dto.comment !== undefined) {
      review.comment = dto.comment;
    }
    review.isEdited = true;

    await review.save();

    // Recalculate seller score in case rating was updated
    await this.recalculateSellerScore(review.sellerId);

    await this.logAuditEvent({
      traceId,
      userId: buyerId,
      actorRole: 'BUYER',
      action: 'REVIEW_EDITED',
      entityType: 'Review',
      entityId: review._id.toString(),
      ipAddress,
      metadata: { rating: review.rating },
    });

    return {
      reviewId: review._id,
      rating: review.rating,
      updatedAt: review.updatedAt,
      message: 'Review updated within 48-hour edit window.',
    };
  }

  public static async replyToReview(
    sellerId: string,
    reviewId: string,
    comment: string,
    traceId: string,
    ipAddress?: string
  ) {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found.', 'REVIEW_NOT_FOUND');
    }

    if (review.sellerId.toString() !== sellerId) {
      throw new ForbiddenError(
        'Unauthorized: You can only reply to reviews on your own listings.',
        'ERR_REVIEW_UNAUTHORIZED'
      );
    }

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - review.createdAt.getTime() > SEVEN_DAYS_MS) {
      throw new ForbiddenError(
        '7-day seller reply window has elapsed.',
        'ERR_SELLER_REPLY_WINDOW_EXPIRED'
      );
    }

    if (review.sellerReply?.comment) {
      throw new ConflictError(
        'Seller has already replied to this review.',
        'ERR_SELLER_REPLY_ALREADY_EXISTS'
      );
    }

    review.sellerReply = {
      comment,
      repliedAt: new Date(),
    };

    await review.save();

    // Send notification to buyer
    try {
      await Notification.create({
        recipientId: review.buyerId,
        type: 'REVIEW_REPLIED',
        title: 'Seller Replied to Your Review',
        body: 'The seller responded to your verified review feedback.',
        entityType: 'Review',
        entityId: review._id,
      });
    } catch (notifErr) {
      logger.error('Failed to notify buyer of review reply:', notifErr);
    }

    await this.logAuditEvent({
      traceId,
      userId: sellerId,
      actorRole: 'SELLER',
      action: 'REVIEW_REPLIED',
      entityType: 'Review',
      entityId: review._id.toString(),
      ipAddress,
      metadata: { commentLength: comment.length },
    });

    return {
      reviewId: review._id,
      sellerReply: review.sellerReply,
    };
  }

  public static async getSellerReviews(sellerId: string, page = 1, limit = 20) {
    const seller = await User.findById(sellerId);
    if (!seller) {
      throw new NotFoundError('Seller not found.', 'USER_NOT_FOUND');
    }

    const filter = {
      sellerId: new Types.ObjectId(sellerId),
      moderationStatus: { $ne: 'REMOVED' },
    };

    const totalRecords = await Review.countDocuments(filter);

    const distributionRaw = await Review.aggregate([
      { $match: filter },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);

    const distribution: Record<string, number> = {
      '5_star': 0,
      '4_star': 0,
      '3_star': 0,
      '2_star': 0,
      '1_star': 0,
    };

    for (const item of distributionRaw) {
      const key = `${item._id}_star`;
      if (key in distribution) {
        distribution[key] = item.count;
      }
    }

    const reviews = await Review.find(filter)
      .populate('buyerId', 'profile isNidVerified')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedReviews = reviews.map((r: any) => ({
      id: r._id,
      buyerName: r.buyerId?.profile?.displayName || 'Verified Buyer',
      buyerAvatar: r.buyerId?.profile?.avatarUrl,
      isBuyerVerified: r.buyerId?.isNidVerified ?? false,
      rating: r.rating,
      comment: r.comment,
      sellerReply: r.sellerReply
        ? {
            comment: r.sellerReply.comment,
            repliedAt: r.sellerReply.repliedAt,
          }
        : undefined,
      createdAt: r.createdAt,
    }));

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      data: {
        ratingAverage: seller.ratingAverage || 0,
        totalReviews: totalRecords,
        distribution,
        reviews: formattedReviews,
      },
      meta: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    };
  }

  public static async reportReview(
    userId: string,
    reviewId: string,
    dto: ReportReviewDto,
    traceId: string,
    ipAddress?: string
  ) {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found.', 'REVIEW_NOT_FOUND');
    }

    review.moderationStatus = 'FLAGGED';
    await review.save();

    await this.logAuditEvent({
      traceId,
      userId,
      actorRole: 'USER',
      action: 'REVIEW_REPORTED',
      entityType: 'Review',
      entityId: review._id.toString(),
      ipAddress,
      metadata: {
        reason: dto.reason,
        details: dto.details,
      },
    });

    return {
      reviewId: review._id,
      moderationStatus: 'FLAGGED',
      message: 'Review flagged and forwarded to moderation queue.',
    };
  }
}
