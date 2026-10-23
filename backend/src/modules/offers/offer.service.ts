import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import { Offer, IOfferDocument } from './offer.model';
import { Listing } from '../listings/listing.model';
import { User } from '../users/user.model';
import { ChatMessage } from '../chats/chatMessage.model';
import { Notification } from '../notifications/notification.model';
import { AuditLog, computeAuditHash } from '../moderation/auditLog.model';
import logger from '../../config/logger';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../../core/errors/AppError';

export class OfferService {
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
      logger.error('Failed to log offer audit event: ', auditErr);
    }
  }

  /**
   * 6.1 Submit Binding Price Offer (NID check + 1 active offer policy)
   */
  public static async submitOffer(params: {
    buyerId: string;
    listingId: string;
    offeredPrice: number;
    clientIp: string;
    traceId: string;
  }): Promise<IOfferDocument> {
    const { buyerId, listingId, offeredPrice, clientIp, traceId } = params;

    // 1. Verify Buyer e-KYC
    const buyer = await User.findById(buyerId);
    if (!buyer) {
      throw new NotFoundError('Buyer profile not found');
    }

    if (!buyer.isNidVerified) {
      throw new ForbiddenError(
        'Identity verification required before submitting offers. Please complete e-KYC clearance.',
        'NID_VERIFICATION_REQUIRED'
      );
    }

    // 2. Verify Target Listing
    const listing = await Listing.findById(listingId);
    if (!listing || listing.status === 'DELETED') {
      throw new NotFoundError('Listing not found or has been removed');
    }

    if (listing.status !== 'ACTIVE') {
      throw new BadRequestError(`Cannot submit offer on a listing with status [${listing.status}].`);
    }

    if (listing.sellerId.equals(buyerId)) {
      throw new BadRequestError('You cannot submit an offer on your own listing.', 'CANNOT_OFFER_OWN_LISTING');
    }

    // 3. One Active Offer Constraint
    const existingActiveOffer = await Offer.findOne({
      listingId: listing._id,
      buyerId: buyer._id,
      status: { $in: ['PENDING', 'COUNTERED'] },
    });

    if (existingActiveOffer) {
      throw new ConflictError(
        'You already have an active offer pending on this item. Please wait for seller response or withdraw your current offer.',
        'ACTIVE_OFFER_EXISTS'
      );
    }

    // 4. Create Offer Document (24h TTL)
    const offer = new Offer({
      listingId: listing._id,
      buyerId: buyer._id,
      sellerId: listing.sellerId,
      offeredPrice,
      currency: 'BDT',
      status: 'PENDING',
      history: [
        {
          action: 'SUBMITTED',
          actorId: buyer._id,
          price: offeredPrice,
          timestamp: new Date(),
        },
      ],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    await offer.save();

    // Increment listing metrics
    await Listing.findByIdAndUpdate(listingId, { $inc: { 'metrics.offerCount': 1 } });

    // Disptach Notification to Seller
    await Notification.create({
      recipientId: listing.sellerId,
      type: 'OFFER_RECEIVED',
      title: 'New Offer Received!',
      body: `A buyer made an offer of ${offeredPrice.toLocaleString()} BDT on "${listing.title}".`,
      entityType: 'OFFER',
      entityId: offer._id,
    });

    // Write Audit Log
    await this.logAuditEvent({
      traceId,
      userId: buyerId,
      actorRole: 'buyer',
      action: 'OFFER_SUBMITTED',
      entityType: 'OFFER',
      entityId: offer._id.toString(),
      ipAddress: clientIp,
      metadata: { listingId, offeredPrice },
    });

    return offer;
  }

  /**
   * 6.2 Accept Offer (Multi-Document ACID Transaction + Competing Offers Auto-Voiding)
   */
  public static async acceptOffer(params: {
    sellerId: string;
    offerId: string;
    clientIp: string;
    traceId: string;
  }) {
    const { sellerId, offerId, clientIp, traceId } = params;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (!offer.sellerId.equals(sellerId)) {
      throw new ForbiddenError('You do not have permission to accept this offer.');
    }

    if (offer.status !== 'PENDING' && offer.status !== 'COUNTERED') {
      throw new BadRequestError(`Offer cannot be accepted because its status is [${offer.status}].`);
    }

    const agreedPrice = offer.counterPrice || offer.offeredPrice;

    // Execute Multi-Document ACID Transaction
    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (sessionErr) {
      session = null; // Standalone fallback
    }

    try {
      // 1. Mark Offer ACCEPTED
      offer.status = 'ACCEPTED';
      offer.history.push({
        action: 'ACCEPTED',
        actorId: new Types.ObjectId(sellerId),
        price: agreedPrice,
        timestamp: new Date(),
      });
      await offer.save(session ? { session } : undefined);

      // 2. Transition Listing to HOLD
      await Listing.findByIdAndUpdate(
        offer.listingId,
        { $set: { status: 'HOLD' } },
        session ? { session } : undefined
      );

      // 3. Auto-Void Other Pending/Countered Offers on this Listing
      await Offer.updateMany(
        {
          listingId: offer.listingId,
          _id: { $ne: offer._id },
          status: { $in: ['PENDING', 'COUNTERED'] },
        },
        {
          $set: { status: 'VOIDED' },
          $push: {
            history: {
              action: 'VOIDED',
              actorId: new Types.ObjectId(sellerId),
              timestamp: new Date(),
            },
          },
        },
        session ? { session } : undefined
      );

      // 4. Inject System Price Lock Badge into Chat Room
      const roomId = `room_${offer.listingId.toString()}_${offer.buyerId.toString()}`;
      await ChatMessage.create(
        [
          {
            roomId,
            listingId: offer.listingId,
            senderId: offer.sellerId,
            recipientId: offer.buyerId,
            messageType: 'SYSTEM_WARNING',
            content: `🤝 OFFER ACCEPTED: The seller has accepted the offer of BDT ${agreedPrice.toLocaleString()}. Price is now locked. Please inspect the item face-to-face before making any payment.`,
            isScamFlagged: false,
          },
        ],
        session ? { session } : undefined
      );

      if (session) {
        await session.commitTransaction();
      }
    } catch (txError) {
      if (session) {
        await session.abortTransaction();
      }
      logger.error('Transaction failure in acceptOffer: ', txError);
      throw txError;
    } finally {
      if (session) {
        session.endSession();
      }
    }

    // 5. Dispatch Notifications
    await Notification.create({
      recipientId: offer.buyerId,
      type: 'OFFER_ACCEPTED',
      title: 'Offer Accepted! Price Locked',
      body: `Your offer of ${agreedPrice.toLocaleString()} BDT was accepted by the seller. Proceed to coordinate meetup.`,
      entityType: 'OFFER',
      entityId: offer._id,
    });

    // 6. Write WORM Audit Log
    await this.logAuditEvent({
      traceId,
      userId: sellerId,
      actorRole: 'seller',
      action: 'OFFER_ACCEPTED',
      entityType: 'OFFER',
      entityId: offer._id.toString(),
      ipAddress: clientIp,
      metadata: { agreedPrice, listingId: offer.listingId.toString() },
    });

    return {
      offerId: offer._id.toString(),
      status: 'ACCEPTED',
      agreedPrice,
      listingStatus: 'HOLD',
      message: 'Offer accepted successfully. Price is locked and competing offers have been voided.',
    };
  }

  /**
   * 6.3 Propose Counter-Offer
   */
  public static async counterOffer(params: {
    sellerId: string;
    offerId: string;
    counterPrice: number;
    clientIp: string;
    traceId: string;
  }) {
    const { sellerId, offerId, counterPrice, clientIp, traceId } = params;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (!offer.sellerId.equals(sellerId)) {
      throw new ForbiddenError('You do not have permission to counter this offer.');
    }

    if (offer.status !== 'PENDING') {
      throw new BadRequestError(`Cannot counter an offer with status [${offer.status}].`);
    }

    offer.counterPrice = counterPrice;
    offer.status = 'COUNTERED';
    offer.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Reset 24h
    offer.history.push({
      action: 'COUNTERED',
      actorId: new Types.ObjectId(sellerId),
      price: counterPrice,
      timestamp: new Date(),
    });

    await offer.save();

    // Notify Buyer
    await Notification.create({
      recipientId: offer.buyerId,
      type: 'OFFER_COUNTERED',
      title: 'Counter-Offer Received',
      body: `Seller countered your offer with ${counterPrice.toLocaleString()} BDT.`,
      entityType: 'OFFER',
      entityId: offer._id,
    });

    // Audit Log
    await this.logAuditEvent({
      traceId,
      userId: sellerId,
      actorRole: 'seller',
      action: 'OFFER_COUNTERED',
      entityType: 'OFFER',
      entityId: offer._id.toString(),
      ipAddress: clientIp,
      metadata: { counterPrice },
    });

    return offer;
  }

  /**
   * 6.4 Decline Offer
   */
  public static async declineOffer(params: {
    sellerId: string;
    offerId: string;
    reason?: string;
    clientIp: string;
    traceId: string;
  }) {
    const { sellerId, offerId, reason, clientIp, traceId } = params;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (!offer.sellerId.equals(sellerId)) {
      throw new ForbiddenError('You do not have permission to decline this offer.');
    }

    if (offer.status !== 'PENDING' && offer.status !== 'COUNTERED') {
      throw new BadRequestError(`Cannot decline an offer with status [${offer.status}].`);
    }

    offer.status = 'DECLINED';
    offer.history.push({
      action: 'DECLINED',
      actorId: new Types.ObjectId(sellerId),
      timestamp: new Date(),
    });

    await offer.save();

    // Audit Log
    await this.logAuditEvent({
      traceId,
      userId: sellerId,
      actorRole: 'seller',
      action: 'OFFER_DECLINED',
      entityType: 'OFFER',
      entityId: offer._id.toString(),
      ipAddress: clientIp,
      metadata: { reason },
    });

    return { offerId: offer._id.toString(), status: 'DECLINED' };
  }

  /**
   * 6.5 Withdraw Offer (by Buyer)
   */
  public static async withdrawOffer(params: {
    buyerId: string;
    offerId: string;
    clientIp: string;
    traceId: string;
  }) {
    const { buyerId, offerId, clientIp, traceId } = params;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (!offer.buyerId.equals(buyerId)) {
      throw new ForbiddenError('You can only withdraw your own offers.');
    }

    if (offer.status !== 'PENDING' && offer.status !== 'COUNTERED') {
      throw new BadRequestError(`Cannot withdraw an offer with status [${offer.status}].`);
    }

    offer.status = 'WITHDRAWN';
    offer.history.push({
      action: 'WITHDRAWN',
      actorId: new Types.ObjectId(buyerId),
      timestamp: new Date(),
    });

    await offer.save();

    // Audit Log
    await this.logAuditEvent({
      traceId,
      userId: buyerId,
      actorRole: 'buyer',
      action: 'OFFER_WITHDRAWN',
      entityType: 'OFFER',
      entityId: offer._id.toString(),
      ipAddress: clientIp,
    });

    return { offerId: offer._id.toString(), status: 'WITHDRAWN' };
  }

  /**
   * 6.6 List Received Offers (for Seller)
   */
  public static async getReceivedOffers(params: {
    sellerId: string;
    listingId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(params.page || 1, 1);
    const limit = Math.min(Math.max(params.limit || 20, 1), 50);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      sellerId: new Types.ObjectId(params.sellerId),
    };

    if (params.listingId) filter.listingId = new Types.ObjectId(params.listingId);
    if (params.status) filter.status = params.status;

    const [total, offers] = await Promise.all([
      Offer.countDocuments(filter),
      Offer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('buyerId', 'profile.displayName isNidVerified avatarUrl ratingAverage')
        .populate('listingId', 'title price images status')
        .lean(),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      offers,
    };
  }

  /**
   * 6.7 List Sent Offers (for Buyer)
   */
  public static async getSentOffers(params: {
    buyerId: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(params.page || 1, 1);
    const limit = Math.min(Math.max(params.limit || 20, 1), 50);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      buyerId: new Types.ObjectId(params.buyerId),
    };

    if (params.status) filter.status = params.status;

    const [total, offers] = await Promise.all([
      Offer.countDocuments(filter),
      Offer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sellerId', 'profile.displayName isNidVerified avatarUrl ratingAverage')
        .populate('listingId', 'title price images status')
        .lean(),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      offers,
    };
  }
}

export default OfferService;
