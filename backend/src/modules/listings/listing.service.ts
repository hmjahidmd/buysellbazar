import crypto from 'crypto';
import { Types } from 'mongoose';
import { Listing, IListingDocument, IListingImage } from './listing.model';
import { User } from '../users/user.model';
import { Offer } from '../offers/offer.model';
import { AuditLog, computeAuditHash } from '../moderation/auditLog.model';
import { processListingImage } from '../../core/utils/mediaProcessor';
import { getRedisClient } from '../../config/redis';
import logger from '../../config/logger';
import {
  NotFoundError,
  ForbiddenError,
  RateLimitError,
  BadRequestError,
} from '../../core/errors/AppError';

export interface CreateListingInput {
  title: string;
  description: string;
  category: string;
  subCategory?: string;
  price: number;
  isNegotiable?: boolean;
  condition: 'BRAND_NEW' | 'LIKE_NEW' | 'USED' | 'FOR_PARTS';
  location: {
    division: string;
    district: string;
    thana: string;
    coordinates?: [number, number];
  };
}

export interface SearchListingsQuery {
  q?: string;
  division?: string;
  district?: string;
  thana?: string;
  category?: string;
  subCategory?: string;
  priceMin?: number;
  priceMax?: number;
  condition?: string;
  verifiedOnly?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'bumped';
  page?: number;
  limit?: number;
}

export class ListingService {
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
        userId: params.userId,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        previousHash,
        currentHash,
        metadata: params.metadata || {},
        createdAt: timestamp,
      });
    } catch (auditErr) {
      logger.error('Failed to log listing audit event: ', auditErr);
    }
  }

  /**
   * 5.1 Create Free Ad Listing (NID verified check + 30 ads / 24h quota enforcement)
   */
  public static async createListing(params: {
    userId: string;
    data: CreateListingInput;
    imageFiles?: Express.Multer.File[];
    clientIp: string;
    traceId: string;
  }): Promise<IListingDocument> {
    const { userId, data, imageFiles = [], clientIp, traceId } = params;

    // 1. Enforce Mandatory e-KYC Verification Guard
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isNidVerified) {
      throw new ForbiddenError(
        'Government NID identity verification is required before publishing ads. Please complete e-KYC clearance.',
        'NID_VERIFICATION_REQUIRED'
      );
    }

    // 2. Enforce 30 Ads / Rolling 24-Hour Quota Guard
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const adsPostedLast24h = await Listing.countDocuments({
      sellerId: user._id,
      createdAt: { $gte: twentyFourHoursAgo },
      status: { $ne: 'DELETED' },
    });

    if (adsPostedLast24h >= 30) {
      throw new RateLimitError(
        'You have reached the maximum free limit of 30 ads per 24 hours. Please wait for the quota window to reset.',
        'DAILY_AD_LIMIT_EXCEEDED'
      );
    }

    // 3. Process Uploaded Images (Sharp WebP + Watermark + dHash)
    const processedImages: IListingImage[] = [];
    for (let i = 0; i < Math.min(imageFiles.length, 10); i++) {
      const file = imageFiles[i];
      const processed = await processListingImage(file.buffer, `ad_${userId}`);
      processedImages.push({
        url: processed.url,
        thumbnailUrl: processed.thumbnailUrl,
        perceptualHash: processed.perceptualHash,
        isPrimary: i === 0, // First image is primary
      });
    }

    // If client supplied custom images in payload
    if (imageFiles.length === 0 && (data as any).images && Array.isArray((data as any).images)) {
      (data as any).images.forEach((item: any, idx: number) => {
        const imgUrl = typeof item === 'string' ? item : item?.url;
        if (imgUrl) {
          processedImages.push({
            url: imgUrl,
            thumbnailUrl: imgUrl,
            perceptualHash: 'hash_' + idx,
            isPrimary: idx === 0,
          });
        }
      });
    }

    // Fallback placeholder image if no images provided
    if (processedImages.length === 0) {
      processedImages.push({
        url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=800',
        thumbnailUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=200',
        perceptualHash: '0000000000000000',
        isPrimary: true,
      });
    }

    // 4. Construct Listing Document
    const listing = new Listing({
      sellerId: user._id,
      title: data.title,
      description: data.description,
      category: data.category,
      subCategory: data.subCategory,
      price: data.price,
      isNegotiable: Boolean(data.isNegotiable),
      condition: data.condition,
      location: {
        division: data.location.division,
        district: data.location.district,
        thana: data.location.thana,
        geoCoordinates: {
          type: 'Point',
          coordinates: data.location.coordinates || [90.4125, 23.8103],
        },
      },
      images: processedImages,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days TTL
    });

    await listing.save();

    // 5. Update User Ad Metrics
    user.dailyAdCount = adsPostedLast24h + 1;
    user.lastAdPostedAt = new Date();
    await user.save();

    // 6. Write WORM Audit Log
    await this.logAuditEvent({
      traceId,
      userId,
      actorRole: user.role,
      action: 'LISTING_CREATED',
      entityType: 'LISTING',
      entityId: listing._id.toString(),
      ipAddress: clientIp,
      metadata: { title: listing.title, price: listing.price, category: listing.category },
    });

    return listing;
  }

  /**
   * 5.2 Multi-Parametric Geo & Faceted Search
   */
  public static async searchListings(query: SearchListingsQuery) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 20, 1), 50);
    const skip = (page - 1) * limit;

    const mongoQuery: Record<string, unknown> = {
      status: 'ACTIVE',
      expiresAt: { $gt: new Date() },
    };

    // Full-Text Search
    if (query.q && query.q.trim()) {
      mongoQuery.$text = { $search: query.q.trim() };
    }

    // Geo-Location Filters
    if (query.division) mongoQuery['location.division'] = new RegExp(`^${query.division.trim()}$`, 'i');
    if (query.district) mongoQuery['location.district'] = new RegExp(`^${query.district.trim()}$`, 'i');
    if (query.thana) mongoQuery['location.thana'] = new RegExp(`^${query.thana.trim()}$`, 'i');

    // Category Filters
    if (query.category) mongoQuery.category = new RegExp(`^${query.category.trim()}$`, 'i');
    if (query.subCategory) mongoQuery.subCategory = new RegExp(`^${query.subCategory.trim()}$`, 'i');

    // Condition Filter
    if (query.condition) mongoQuery.condition = query.condition;

    // Price Range Filter
    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (query.priceMin !== undefined) priceFilter.$gte = query.priceMin;
      if (query.priceMax !== undefined) priceFilter.$lte = query.priceMax;
      mongoQuery.price = priceFilter;
    }

    // Determine Sorting Strategy: Prioritize boosted TOP_ADs first!
    const sortStrategy: Record<string, 1 | -1> = {
      'boost.isTopAd': -1, // TOP_ADs always float to the top
    };

    switch (query.sort) {
      case 'price_asc':
        sortStrategy.price = 1;
        break;
      case 'price_desc':
        sortStrategy.price = -1;
        break;
      case 'bumped':
        sortStrategy['boost.bumpedAt'] = -1;
        sortStrategy.createdAt = -1;
        break;
      case 'newest':
      default:
        sortStrategy.createdAt = -1;
        break;
    }

    const [total, results] = await Promise.all([
      Listing.countDocuments(mongoQuery),
      Listing.find(mongoQuery)
        .sort(sortStrategy)
        .skip(skip)
        .limit(limit)
        .populate('sellerId', 'profile.displayName isNidVerified ratingAverage ratingCount avatarUrl')
        .lean(),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      results,
    };
  }

  /**
   * 5.3 Get Single Listing Details & Atomic View Count Increment
   */
  public static async getListingDetails(listingId: string, clientIp: string) {
    const listing = await Listing.findById(listingId).populate(
      'sellerId',
      'profile.displayName profile.avatarUrl profile.bio profile.division profile.district profile.thana isNidVerified ratingAverage ratingCount createdAt'
    );

    if (!listing || listing.status === 'DELETED') {
      throw new NotFoundError('Listing not found or has been removed');
    }

    // Deduplicate views via Redis per IP per listing (10 minutes window)
    try {
      const redis = getRedisClient();
      const viewKey = `view:${listingId}:${clientIp}`;
      const alreadyViewed = await redis.get(viewKey);

      if (!alreadyViewed) {
        await redis.set(viewKey, '1', 'EX', 600);
        await Listing.findByIdAndUpdate(listingId, { $inc: { 'metrics.viewsCount': 1 } });
        listing.metrics.viewsCount += 1;
      }
    } catch (err) {
      logger.warn('Failed to increment view counter in Redis: ', err);
    }

    return listing;
  }

  /**
   * 5.4 Update Listing Details
   */
  public static async updateListing(
    userId: string,
    listingId: string,
    updateData: Partial<CreateListingInput>
  ) {
    const listing = await Listing.findById(listingId);
    if (!listing || listing.status === 'DELETED') {
      throw new NotFoundError('Listing not found');
    }

    if (!listing.sellerId.equals(userId)) {
      throw new ForbiddenError('You do not have permission to modify this listing');
    }

    if (updateData.title !== undefined) listing.title = updateData.title;
    if (updateData.description !== undefined) listing.description = updateData.description;
    if (updateData.price !== undefined) listing.price = updateData.price;
    if (updateData.isNegotiable !== undefined) listing.isNegotiable = updateData.isNegotiable;
    if (updateData.condition !== undefined) listing.condition = updateData.condition;
    if (updateData.location) {
      if (updateData.location.division) listing.location.division = updateData.location.division;
      if (updateData.location.district) listing.location.district = updateData.location.district;
      if (updateData.location.thana) listing.location.thana = updateData.location.thana;
      if (updateData.location.coordinates) {
        listing.location.geoCoordinates = {
          type: 'Point',
          coordinates: updateData.location.coordinates,
        };
      }
    }

    await listing.save();
    return listing;
  }

  /**
   * 5.5 Mark Listing as Sold
   */
  public static async markSold(userId: string, listingId: string, traceId: string, clientIp?: string) {
    const listing = await Listing.findById(listingId);
    if (!listing || listing.status === 'DELETED') {
      throw new NotFoundError('Listing not found');
    }

    if (!listing.sellerId.equals(userId)) {
      throw new ForbiddenError('You do not have permission to update this listing');
    }

    listing.status = 'SOLD';
    await listing.save();

    // Auto-void any pending or countered offers for this listing
    await Offer.updateMany(
      { listingId: listing._id, status: { $in: ['PENDING', 'COUNTERED'] } },
      { $set: { status: 'VOIDED' } }
    );

    await this.logAuditEvent({
      traceId,
      userId,
      actorRole: 'seller',
      action: 'LISTING_MARKED_SOLD',
      entityType: 'LISTING',
      entityId: listingId,
      ipAddress: clientIp,
    });

    return { listingId, status: 'SOLD', message: 'Listing marked as sold successfully.' };
  }

  /**
   * 5.6 Renew Expired Listing
   */
  public static async renewListing(userId: string, listingId: string) {
    const listing = await Listing.findById(listingId);
    if (!listing || listing.status === 'DELETED') {
      throw new NotFoundError('Listing not found');
    }

    if (!listing.sellerId.equals(userId)) {
      throw new ForbiddenError('You do not have permission to renew this listing');
    }

    listing.status = 'ACTIVE';
    listing.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days renewal
    await listing.save();

    return {
      listingId,
      status: 'ACTIVE',
      expiresAt: listing.expiresAt,
      message: 'Listing renewed for 30 days.',
    };
  }

  /**
   * 5.7 Soft-Delete Listing
   */
  public static async deleteListing(userId: string, listingId: string, traceId: string, clientIp?: string) {
    const listing = await Listing.findById(listingId);
    if (!listing || listing.status === 'DELETED') {
      throw new NotFoundError('Listing not found');
    }

    if (!listing.sellerId.equals(userId)) {
      throw new ForbiddenError('You do not have permission to delete this listing');
    }

    listing.status = 'DELETED';
    await listing.save();

    await this.logAuditEvent({
      traceId,
      userId,
      actorRole: 'seller',
      action: 'LISTING_DELETED',
      entityType: 'LISTING',
      entityId: listingId,
      ipAddress: clientIp,
    });

    return { deleted: true, listingId };
  }

  /**
   * 5.8 Get Seller's My Listings Dashboard
   */
  public static async getMyListings(
    userId: string,
    statusFilter?: string,
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {
      sellerId: new Types.ObjectId(userId),
    };

    if (statusFilter) {
      filter.status = statusFilter;
    } else {
      filter.status = { $ne: 'DELETED' };
    }

    const [total, listings] = await Promise.all([
      Listing.countDocuments(filter),
      Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      listings,
    };
  }
}

export default ListingService;
