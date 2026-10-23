import crypto from 'crypto';
import { Types } from 'mongoose';
import { Storefront, IStorefrontDocument, StorefrontTier } from './storefront.model';
import { User } from '../users/user.model';
import { Listing } from '../listings/listing.model';
import { ChatMessage } from '../chats/chatMessage.model';
import { AuditLog, computeAuditHash } from '../moderation/auditLog.model';
import env from '../../config/env';
import logger from '../../config/logger';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../../core/errors/AppError';

export interface RegisterStorefrontDto {
  storeSlug: string;
  brandName?: string;
  storeName?: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  businessCategory?: string;
  tradeLicenseNumber?: string;
  tier?: StorefrontTier;
  contact?: {
    officialPhone?: string;
    officialEmail?: string;
    physicalStoreAddress?: string;
    websiteUrl?: string;
  };
  address?: {
    division?: string;
    district?: string;
    thana?: string;
    streetAddress?: string;
  };
}

export interface UpdateStorefrontDto {
  tagline?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  businessCategory?: string;
  contact?: {
    officialPhone?: string;
    officialEmail?: string;
    physicalStoreAddress?: string;
    websiteUrl?: string;
  };
  address?: {
    division?: string;
    district?: string;
    thana?: string;
    streetAddress?: string;
  };
}

const TIER_QUOTAS: Record<StorefrontTier, number> = {
  BASIC: 100,
  PRO: 300,
  PLATINUM: 500,
  ENTERPRISE: 1000,
};

export class StorefrontService {
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
      logger.error('Failed to log WORM audit event in StorefrontService:', err);
    }
  }

  public static async registerStorefront(
    merchantId: string,
    dto: RegisterStorefrontDto,
    traceId: string,
    ipAddress?: string
  ) {
    const user = await User.findById(merchantId);
    if (!user) {
      throw new NotFoundError('User account not found.', 'USER_NOT_FOUND');
    }

    // 1. Mandatory e-KYC Verification Guard
    if (!user.isNidVerified) {
      throw new ForbiddenError(
        'Mandatory e-KYC verification required before registering a commercial storefront.',
        'ERR_KYC_REQUIRED'
      );
    }

    // 2. Prevent Multiple Storefronts per Account
    const existingStore = await Storefront.findOne({ merchantId: user._id });
    if (existingStore) {
      throw new ConflictError(
        'User already has a registered commercial storefront.',
        'ERR_STOREFRONT_EXISTS'
      );
    }

    // 3. Unique Slug Check
    const slugClaimed = await Storefront.findOne({ storeSlug: dto.storeSlug.toLowerCase() });
    if (slugClaimed) {
      throw new ConflictError(
        'Store slug is already claimed by another merchant.',
        'ERR_SLUG_TAKEN'
      );
    }

    const tier = dto.tier || 'BASIC';
    const quotaLimit = TIER_QUOTAS[tier] || 100;
    const now = Date.now();
    const subscriptionExpiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000); // 30 Days
    const gracePeriodExpiresAt = new Date(now + 35 * 24 * 60 * 60 * 1000); // 30d + 5d grace

    const storefront = await Storefront.create({
      merchantId: user._id,
      storeName: dto.brandName || dto.storeName || 'Official Store',
      storeSlug: dto.storeSlug.toLowerCase(),
      tagline: dto.tagline,
      description: dto.description,
      logoUrl: dto.logoUrl,
      bannerUrl: dto.bannerUrl,
      businessCategory: dto.businessCategory || 'General Merchandise',
      tradeLicenseNumber: dto.tradeLicenseNumber,
      isLicenseVerified: false,
      tier,
      quotaLimit,
      subscriptionExpiresAt,
      gracePeriodExpiresAt,
      status: 'ACTIVE',
      contact: dto.contact,
      address: dto.address || {
        division: 'Dhaka',
        district: 'Dhaka',
        thana: 'Gulshan',
      },
    });

    // 4. Upgrade User Role to Merchant
    user.role = 'merchant';
    await user.save();

    // 5. Cryptographic WORM Audit Trail
    await this.logAuditEvent({
      traceId,
      userId: merchantId,
      actorRole: 'MERCHANT',
      action: 'STOREFRONT_REGISTERED',
      entityType: 'Storefront',
      entityId: storefront._id.toString(),
      ipAddress,
      metadata: {
        storeSlug: storefront.storeSlug,
        tier: storefront.tier,
        quotaLimit,
      },
    });

    return {
      storefrontId: storefront._id,
      storeSlug: storefront.storeSlug,
      vanityUrl: `${env.FRONTEND_URL}/store/${storefront.storeSlug}`,
      status: storefront.status,
      tier: storefront.tier,
    };
  }

  public static async getStorefrontBySlug(slug: string) {
    const storefront = await Storefront.findOne({
      storeSlug: slug.toLowerCase(),
    });

    if (!storefront) {
      throw new NotFoundError('Storefront not found.', 'STOREFRONT_NOT_FOUND');
    }

    const merchant = await User.findById(storefront.merchantId).select(
      'profile ratingAverage ratingCount isNidVerified createdAt'
    );

    const totalListings = await Listing.countDocuments({
      sellerId: storefront.merchantId,
      status: 'ACTIVE',
    });

    const activeListings = await Listing.find({
      sellerId: storefront.merchantId,
      status: 'ACTIVE',
    })
      .sort({ 'boost.isTopAd': -1, createdAt: -1 })
      .limit(30)
      .lean();

    return {
      brandName: storefront.storeName,
      storeSlug: storefront.storeSlug,
      tagline: storefront.tagline,
      description: storefront.description,
      logoUrl: storefront.logoUrl,
      bannerUrl: storefront.bannerUrl,
      tier: storefront.tier,
      status: storefront.status,
      tradeLicenseVerified: storefront.isLicenseVerified,
      merchant: {
        id: storefront.merchantId,
        name: merchant?.profile?.displayName || 'Verified Merchant',
        avatarUrl: merchant?.profile?.avatarUrl,
        ratingAverage: merchant?.ratingAverage || 0,
        ratingCount: merchant?.ratingCount || 0,
        isNidVerified: merchant?.isNidVerified ?? false,
      },
      metrics: {
        totalListings,
        followerCount: 0,
      },
      contact: storefront.contact,
      address: storefront.address,
      listings: activeListings,
    };
  }

  public static async updateStorefrontProfile(
    merchantId: string,
    dto: UpdateStorefrontDto,
    traceId: string,
    ipAddress?: string
  ) {
    const storefront = await Storefront.findOne({ merchantId });
    if (!storefront) {
      throw new NotFoundError(
        'Storefront profile not found for this merchant.',
        'STOREFRONT_NOT_FOUND'
      );
    }

    if (dto.tagline !== undefined) storefront.tagline = dto.tagline;
    if (dto.description !== undefined) storefront.description = dto.description;
    if (dto.logoUrl !== undefined) storefront.logoUrl = dto.logoUrl;
    if (dto.bannerUrl !== undefined) storefront.bannerUrl = dto.bannerUrl;
    if (dto.businessCategory !== undefined) storefront.businessCategory = dto.businessCategory;

    if (dto.contact) {
      storefront.contact = {
        ...storefront.contact,
        ...dto.contact,
      };
    }

    if (dto.address) {
      storefront.address = {
        ...storefront.address,
        ...dto.address,
      } as any;
    }

    await storefront.save();

    await this.logAuditEvent({
      traceId,
      userId: merchantId,
      actorRole: 'MERCHANT',
      action: 'STOREFRONT_UPDATED',
      entityType: 'Storefront',
      entityId: storefront._id.toString(),
      ipAddress,
      metadata: { fieldsUpdated: Object.keys(dto) },
    });

    return {
      updatedAt: storefront.updatedAt,
      message: 'Storefront details updated successfully.',
    };
  }

  public static async getMerchantAnalytics(merchantId: string) {
    const storefront = await Storefront.findOne({ merchantId });
    if (!storefront) {
      throw new NotFoundError(
        'Storefront not found for this merchant.',
        'STOREFRONT_NOT_FOUND'
      );
    }

    const sellerObjId = new Types.ObjectId(merchantId);

    const totalActiveListings = await Listing.countDocuments({
      sellerId: sellerObjId,
      status: 'ACTIVE',
    });

    const totalSoldListings = await Listing.countDocuments({
      sellerId: sellerObjId,
      status: 'SOLD',
    });

    const viewsAgg = await Listing.aggregate([
      { $match: { sellerId: sellerObjId } },
      { $group: { _id: null, totalViews: { $sum: '$viewCount' } } },
    ]);
    const totalViews = viewsAgg.length > 0 ? viewsAgg[0].totalViews : 0;

    const chatRooms = await ChatMessage.distinct('roomId', {
      recipientId: sellerObjId,
    });
    const totalChatLeads = chatRooms.length;

    const leadConversionRatePercent =
      totalViews > 0 ? Math.round((totalChatLeads / totalViews) * 1000) / 10 : 0;

    const topItems = await Listing.find({ sellerId: sellerObjId })
      .sort({ viewCount: -1 })
      .limit(5)
      .select('title viewCount price status images')
      .lean();

    return {
      storeSlug: storefront.storeSlug,
      totalActiveListings,
      totalSoldListings,
      totalViews,
      totalChatLeads,
      leadConversionRatePercent,
      topPerformingItems: topItems.map((item: any) => ({
        title: item.title,
        views: item.viewCount || 0,
        price: item.price,
        status: item.status,
        thumbnail: item.images?.[0]?.thumbnailUrl || item.images?.[0]?.url,
      })),
    };
  }
}
