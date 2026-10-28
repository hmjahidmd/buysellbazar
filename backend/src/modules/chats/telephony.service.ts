import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../users/user.model';
import { Listing } from '../listings/listing.model';
import { AuditLog, computeAuditHash } from '../moderation/auditLog.model';
import { getRedisClient } from '../../config/redis';
import logger from '../../config/logger';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../core/errors/AppError';

export class TelephonyService {
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
      logger.error('Failed to log telephony audit event: ', auditErr);
    }
  }

  /**
   * 7.5 Initiate Privacy-Preserving Masked Audio Call Bridge
   */
  public static async initiateMaskedCall(params: {
    callerId: string;
    recipientId: string;
    listingId: string;
    clientIp: string;
    traceId: string;
  }) {
    const { callerId, recipientId, listingId, clientIp, traceId } = params;

    if (callerId === recipientId) {
      throw new BadRequestError('Cannot initiate call to yourself.');
    }

    const [caller, recipient, listing] = await Promise.all([
      User.findById(callerId),
      User.findById(recipientId),
      Listing.findById(listingId),
    ]);

    if (!caller || !recipient) {
      throw new NotFoundError('One or both parties to this call were not found.');
    }

    if (!listing || listing.status === 'DELETED') {
      throw new NotFoundError('Listing associated with this call is no longer available.');
    }

    // Security Gate: Both parties must be e-KYC verified
    if (!caller.isNidVerified) {
      throw new ForbiddenError(
        'Identity verification required before initiating proxy calls. Complete e-KYC first.',
        'NID_VERIFICATION_REQUIRED'
      );
    }

    if (!recipient.isNidVerified) {
      throw new ForbiddenError(
        'Counterpart user has not completed identity verification. Masked calling unavailable for unverified parties.',
        'RECIPIENT_NOT_VERIFIED'
      );
    }

    // Telephony Bridge Session Setup (Virtual Number Masking)
    const sessionId = uuidv4();
    const virtualBridgeNumber = '+8801791373280'; // Dedicated BTRC-compliant virtual VoIP DID
    const maxDurationSeconds = 600; // 10 minutes session limit
    const expiresAt = new Date(Date.now() + maxDurationSeconds * 1000);

    // Cache call routing mapping in Redis with 10-minute TTL
    try {
      const redis = getRedisClient();
      await redis.set(
        `telephony_session:${sessionId}`,
        JSON.stringify({
          callerMobile: caller.mobileNumber,
          recipientMobile: recipient.mobileNumber,
          listingId,
          virtualBridgeNumber,
        }),
        'EX',
        maxDurationSeconds
      );
    } catch (redisErr) {
      logger.warn('Failed to cache telephony session in Redis: ', redisErr);
    }

    // WORM Audit Log (DF-21 / DF-22)
    await this.logAuditEvent({
      traceId,
      userId: callerId,
      actorRole: caller.role,
      action: 'TELEPHONY_PROXY_BRIDGE_INITIATED',
      entityType: 'CALL_SESSION',
      entityId: sessionId,
      ipAddress: clientIp,
      metadata: {
        callerMasked: `${caller.mobileNumber.slice(0, 3)}****${caller.mobileNumber.slice(-4)}`,
        recipientMasked: `${recipient.mobileNumber.slice(0, 3)}****${recipient.mobileNumber.slice(-4)}`,
        virtualBridgeNumber,
        listingId,
      },
    });

    return {
      bridgeNumber: virtualBridgeNumber,
      sessionId,
      expiresAt,
      maxDurationSeconds,
      instructions: 'Dial the virtual bridge number from your registered mobile number to connect without revealing your personal identity.',
    };
  }
}

export default TelephonyService;
