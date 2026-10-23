import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import { Payment, IPaymentDocument, BoostType, PaymentGateway } from './payment.model';
import { Listing } from '../listings/listing.model';
import { Storefront } from '../storefronts/storefront.model';
import { Notification } from '../notifications/notification.model';
import { AuditLog, computeAuditHash } from '../moderation/auditLog.model';
import env from '../../config/env';
import logger from '../../config/logger';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} from '../../core/errors/AppError';

export interface BoostConfig {
  amount: number;
  durationDays: number;
}

export const BOOST_PRICING: Record<BoostType, BoostConfig> = {
  TOP_AD_3D: { amount: 249, durationDays: 3 },
  TOP_AD_7D: { amount: 499, durationDays: 7 },
  TOP_AD_15D: { amount: 899, durationDays: 15 },
  BUMP_UP: { amount: 99, durationDays: 0 },
  STOREFRONT_TIER_BASIC: { amount: 999, durationDays: 30 },
  STOREFRONT_TIER_PRO: { amount: 2499, durationDays: 30 },
};

export interface InitiateCheckoutDto {
  targetType: 'LISTING' | 'STOREFRONT_SUBSCRIPTION';
  targetId: string;
  boostType: BoostType;
  gateway: PaymentGateway;
  customerMsisdn?: string;
  redirectUrls?: {
    successUrl?: string;
    failUrl?: string;
    cancelUrl?: string;
  };
}

export interface MfsWebhookDto {
  transactionRef: string;
  gatewayTransactionId: string;
  gateway: PaymentGateway;
  status: 'PAID' | 'FAILED' | 'CANCELLED';
  amount: number;
  currency?: string;
  payerMsisdn?: string;
  paidAt?: string;
  signature?: string;
}

export class PaymentService {
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
      logger.error('Failed to log WORM audit event in PaymentService:', err);
    }
  }

  /**
   * 10.1 Initiate Boost Checkout Order
   */
  public static async initiateCheckout(
    userId: string,
    dto: InitiateCheckoutDto,
    traceId: string,
    ipAddress?: string
  ) {
    const pricing = BOOST_PRICING[dto.boostType];
    if (!pricing) {
      throw new BadRequestError('Invalid boostType specified.', 'INVALID_BOOST_TYPE');
    }

    let targetListingId: Types.ObjectId | undefined;
    let targetStorefrontId: Types.ObjectId | undefined;

    if (dto.targetType === 'LISTING') {
      const listing = await Listing.findById(dto.targetId);
      if (!listing) {
        throw new NotFoundError('Target listing not found.', 'LISTING_NOT_FOUND');
      }

      if (listing.sellerId.toString() !== userId) {
        throw new ForbiddenError(
          'Authenticated user does not own target listing.',
          'NOT_OWNER'
        );
      }

      // Check if TOP_AD is already active
      if (
        dto.boostType.startsWith('TOP_AD') &&
        listing.boost?.isTopAd &&
        listing.boost?.topAdExpiresAt &&
        new Date(listing.boost.topAdExpiresAt) > new Date()
      ) {
        throw new BadRequestError(
          'Listing already has an active TOP_AD boost.',
          'INVALID_TARGET'
        );
      }

      targetListingId = listing._id;
    } else if (dto.targetType === 'STOREFRONT_SUBSCRIPTION') {
      const storefront = await Storefront.findById(dto.targetId);
      if (!storefront) {
        throw new NotFoundError('Target storefront not found.', 'STOREFRONT_NOT_FOUND');
      }

      if (storefront.merchantId.toString() !== userId) {
        throw new ForbiddenError(
          'Authenticated merchant does not own target storefront.',
          'NOT_OWNER'
        );
      }

      targetStorefrontId = storefront._id;
    }

    // Generate unique transaction reference
    const gatewayCode =
      dto.gateway === 'BKASH'
        ? 'BK'
        : dto.gateway === 'NAGAD'
        ? 'NG'
        : dto.gateway === 'ROCKET'
        ? 'RK'
        : 'SSL';
    const transactionRef = `TXN_${gatewayCode}_${Date.now()}${crypto.randomInt(1000, 9999)}`;

    const payment = await Payment.create({
      userId: new Types.ObjectId(userId),
      listingId: targetListingId,
      storefrontId: targetStorefrontId,
      transactionRef,
      gateway: dto.gateway,
      amount: pricing.amount,
      currency: 'BDT',
      status: 'INITIATED',
      boostType: dto.boostType,
      durationDays: pricing.durationDays,
      paymentMetadata: {
        customerMsisdn: dto.customerMsisdn,
        redirectUrls: dto.redirectUrls,
      },
    });

    // Upstream MFS Gateway redirect URL
    const gatewayPaymentUrl = `https://checkout.sandbox.${dto.gateway.toLowerCase()}.com/v1/checkout/execute/${transactionRef}?token=mock_mfs_${transactionRef}`;

    await this.logAuditEvent({
      traceId,
      userId,
      actorRole: 'USER',
      action: 'PAYMENT_CHECKOUT_INITIATED',
      entityType: 'Payment',
      entityId: payment._id.toString(),
      ipAddress,
      metadata: {
        transactionRef,
        amount: pricing.amount,
        boostType: dto.boostType,
        gateway: dto.gateway,
      },
    });

    return {
      paymentId: payment._id,
      transactionRef,
      amount: payment.amount,
      currency: payment.currency,
      gateway: payment.gateway,
      status: payment.status,
      gatewayPaymentUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes checkout TTL
    };
  }

  /**
   * Verify HMAC-SHA256 signature for incoming MFS Webhook
   */
  public static verifyWebhookSignature(
    rawBody: unknown,
    receivedSignature?: string
  ): boolean {
    if (env.NODE_ENV === 'development' && (receivedSignature === 'dev_sandbox' || receivedSignature === 'dev_mock_signature')) {
      return true;
    }

    if (!receivedSignature) return false;

    try {
      const payloadString =
        typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);

      const expectedSig = crypto
        .createHmac('sha256', env.MFS_WEBHOOK_SECRET)
        .update(payloadString)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSig, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * 10.2 Handle Payment Gateway IPN / Webhook Callback
   */
  public static async handleMfsWebhook(
    payload: MfsWebhookDto,
    signatureHeader?: string,
    rawBody?: string,
    traceId?: string
  ) {
    const receivedSig = signatureHeader || payload.signature;

    // Security Check: Verify HMAC-SHA256 signature
    const isSignatureValid = this.verifyWebhookSignature(
      rawBody || payload,
      receivedSig
    );

    if (!isSignatureValid) {
      throw new UnauthorizedError(
        'Webhook signature verification failed.',
        'INVALID_WEBHOOK_SIGNATURE'
      );
    }

    // Fetch existing payment
    const payment = await Payment.findOne({ transactionRef: payload.transactionRef });
    if (!payment) {
      throw new NotFoundError(
        'Unknown transaction reference.',
        'TRANSACTION_NOT_FOUND'
      );
    }

    // Idempotency Check: Already settled payments return cached acknowledgment
    if (payment.status === 'PAID') {
      return {
        acknowledged: true,
        transactionRef: payment.transactionRef,
        boostActivated: true,
        alreadyProcessed: true,
      };
    }

    if (payment.status === 'CANCELLED' || payment.status === 'FAILED') {
      throw new ConflictError(
        'Duplicate callback for finalized transaction.',
        'TRANSACTION_ALREADY_SETTLED'
      );
    }

    // Execute Atomic MongoDB Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      payment.status = payload.status === 'PAID' ? 'PAID' : 'FAILED';
      payment.gatewayTransactionId = payload.gatewayTransactionId;
      if (payload.status === 'PAID') {
        payment.paidAt = new Date(payload.paidAt || Date.now());
      } else {
        payment.failedAt = new Date();
      }
      await payment.save({ session });

      let boostExpiresAt: Date | undefined;

      if (payload.status === 'PAID') {
        // Boost Listing
        if (payment.listingId) {
          const listing = await Listing.findById(payment.listingId).session(session);
          if (listing) {
            if (payment.boostType.startsWith('TOP_AD')) {
              const days = payment.durationDays || 7;
              boostExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
              listing.boost.isTopAd = true;
              listing.boost.topAdExpiresAt = boostExpiresAt;
            } else if (payment.boostType === 'BUMP_UP') {
              listing.boost.isBumped = true;
              listing.boost.bumpedAt = new Date();
              listing.createdAt = new Date(); // Reset sort order
            }
            await listing.save({ session });
          }
        }

        // Boost Storefront Subscription
        if (payment.storefrontId) {
          const storefront = await Storefront.findById(payment.storefrontId).session(session);
          if (storefront) {
            storefront.subscriptionExpiresAt = new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            );
            storefront.gracePeriodExpiresAt = new Date(
              Date.now() + 35 * 24 * 60 * 60 * 1000
            );
            storefront.status = 'ACTIVE';
            await storefront.save({ session });
          }
        }

        // WORM Audit Log
        await this.logAuditEvent({
          traceId: traceId || 'trace-mfs-webhook',
          userId: payment.userId.toString(),
          actorRole: 'SYSTEM_WEBHOOK',
          action: 'PAYMENT_SETTLED_BOOST_ACTIVATED',
          entityType: 'Payment',
          entityId: payment._id.toString(),
          metadata: {
            transactionRef: payment.transactionRef,
            gatewayTransactionId: payment.gatewayTransactionId,
            amount: payment.amount,
            boostType: payment.boostType,
          },
        });

        // Instant In-App Notification
        try {
          await Notification.create(
            [
              {
                recipientId: payment.userId,
                type: 'BOOST_ACTIVATED',
                title: 'Boost Activated Successfully',
                body: `Your ${payment.boostType} boost has been successfully activated.`,
                entityType: 'Payment',
                entityId: payment._id,
              },
            ],
            { session }
          );
        } catch (notifErr) {
          logger.error('Failed to create payment boost notification:', notifErr);
        }
      }

      await session.commitTransaction();
      session.endSession();

      return {
        acknowledged: true,
        transactionRef: payment.transactionRef,
        boostActivated: payload.status === 'PAID',
        expiresAt: boostExpiresAt,
      };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  /**
   * 10.3 Get User Payment & Transaction History
   */
  public static async getPaymentHistory(
    userId: string,
    status?: string,
    page = 1,
    limit = 15
  ) {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (status) {
      filter.status = status;
    }

    const total = await Payment.countDocuments(filter);

    const payments = await Payment.find(filter)
      .populate('listingId', 'title images')
      .populate('storefrontId', 'storeName storeSlug')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formattedPayments = payments.map((p: any) => ({
      paymentId: p._id,
      transactionRef: p.transactionRef,
      gatewayTransactionId: p.gatewayTransactionId,
      gateway: p.gateway,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      boostType: p.boostType,
      targetListing: p.listingId
        ? {
            listingId: p.listingId._id,
            title: p.listingId.title,
            thumbnail: p.listingId.images?.[0]?.thumbnailUrl || p.listingId.images?.[0]?.url,
          }
        : undefined,
      targetStorefront: p.storefrontId
        ? {
            storefrontId: p.storefrontId._id,
            storeName: p.storefrontId.storeName,
            storeSlug: p.storefrontId.storeSlug,
          }
        : undefined,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    }));

    return {
      total,
      page,
      limit,
      payments: formattedPayments,
    };
  }

  /**
   * 10.4 Query Specific Payment Status
   */
  public static async getPaymentStatus(userId: string, identifier: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
    const filter = isObjectId
      ? { _id: new Types.ObjectId(identifier) }
      : { transactionRef: identifier };

    const payment = await Payment.findOne(filter);
    if (!payment) {
      throw new NotFoundError('Payment record not found.', 'PAYMENT_NOT_FOUND');
    }

    if (payment.userId.toString() !== userId) {
      throw new ForbiddenError(
        'Unauthorized to view this payment record.',
        'UNAUTHORIZED_PAYMENT_VIEW'
      );
    }

    return {
      paymentId: payment._id,
      transactionRef: payment.transactionRef,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt,
    };
  }
}
