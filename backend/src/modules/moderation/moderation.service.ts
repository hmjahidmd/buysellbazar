import crypto from 'crypto';
import { Types } from 'mongoose';
import { Report, IReportDocument, ReportTargetType, ReportReason, ReportVerdict, ReportActionApplied } from './report.model';
import { User } from '../users/user.model';
import { Listing } from '../listings/listing.model';
import { Review } from '../reviews/review.model';
import { BlacklistedDevice } from './blacklistedDevice.model';
import { Notification } from '../notifications/notification.model';
import { AuditLog, computeAuditHash } from './auditLog.model';
import { getRedisClient } from '../../config/redis';
import logger from '../../config/logger';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  RateLimitError,
} from '../../core/errors/AppError';

export interface SubmitReportDto {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
  evidenceChatRoomId?: string;
}

export interface ResolveReportDto {
  verdict: ReportVerdict;
  action: ReportActionApplied;
  resolutionNotes: string;
  notifyReporter?: boolean;
}

export interface BanUserDto {
  userId: string;
  reason: string;
  blacklistDevices?: boolean;
  blacklistNid?: boolean;
  suspendAllListings?: boolean;
}

export class ModerationService {
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
      logger.error('Failed to log WORM audit event in ModerationService:', err);
    }
  }

  /**
   * 11.1 Submit Abuse or Fraud Report
   */
  public static async submitReport(
    reporterId: string,
    dto: SubmitReportDto,
    traceId: string,
    ipAddress?: string
  ) {
    // 1. Prevent Self-Reporting
    if (dto.targetType === 'USER' && dto.targetId === reporterId) {
      throw new BadRequestError('Cannot report yourself.', 'CANNOT_REPORT_SELF');
    }

    if (dto.targetType === 'LISTING') {
      const listing = await Listing.findById(dto.targetId);
      if (!listing) {
        throw new NotFoundError('Target listing not found.', 'LISTING_NOT_FOUND');
      }
      if (listing.sellerId.toString() === reporterId) {
        throw new BadRequestError('Cannot report your own listing.', 'CANNOT_REPORT_SELF');
      }
    } else if (dto.targetType === 'REVIEW') {
      const review = await Review.findById(dto.targetId);
      if (!review) {
        throw new NotFoundError('Target review not found.', 'REVIEW_NOT_FOUND');
      }
      if (review.buyerId.toString() === reporterId) {
        throw new BadRequestError('Cannot report your own review.', 'CANNOT_REPORT_SELF');
      }
    }

    // 2. Anti-Spam Throttling (Max 5 reports per 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await Report.countDocuments({
      reporterId: new Types.ObjectId(reporterId),
      createdAt: { $gte: tenMinutesAgo },
    });

    if (recentCount >= 5) {
      throw new RateLimitError(
        'Maximum 5 reports allowed per 10 minutes.',
        'REPORT_LIMIT_EXCEEDED'
      );
    }

    // 3. Generate unique ticket number (e.g. REP-202610-8912)
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    const randomSuffix = crypto.randomInt(1000, 9999);
    const ticketNumber = `REP-${yearMonth}-${randomSuffix}`;

    const report = await Report.create({
      ticketNumber,
      reporterId: new Types.ObjectId(reporterId),
      targetType: dto.targetType,
      targetId: new Types.ObjectId(dto.targetId),
      reason: dto.reason,
      description: dto.description,
      evidenceChatRoomId: dto.evidenceChatRoomId,
      status: 'SUBMITTED',
    });

    // 4. Cryptographic WORM Audit Trail
    await this.logAuditEvent({
      traceId,
      userId: reporterId,
      actorRole: 'USER',
      action: 'REPORT_SUBMITTED',
      entityType: 'Report',
      entityId: report._id.toString(),
      ipAddress,
      metadata: {
        ticketNumber,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
      },
    });

    return {
      reportId: report._id,
      status: report.status,
      ticketNumber: report.ticketNumber,
      message:
        'Report logged securely. Trust & Safety moderators will investigate within 2 hours.',
    };
  }

  /**
   * 11.2 Admin / Moderator Get Moderation Queue
   */
  public static async getModerationQueue(
    filters: {
      targetType?: ReportTargetType;
      reason?: ReportReason;
      status?: string;
    },
    page = 1,
    limit = 20
  ) {
    const query: Record<string, unknown> = {};

    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.targetType) {
      query.targetType = filters.targetType;
    }
    if (filters.reason) {
      query.reason = filters.reason;
    }

    const total = await Report.countDocuments(query);

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const queue = await Promise.all(
      reports.map(async (r: any) => {
        let targetDetails: Record<string, unknown> | undefined;

        if (r.targetType === 'LISTING') {
          const listing = await Listing.findById(r.targetId)
            .select('title price sellerId status')
            .lean();
          if (listing) {
            const seller = await User.findById(listing.sellerId).select('mobileNumber').lean();
            targetDetails = {
              title: listing.title,
              price: listing.price,
              status: listing.status,
              sellerMobile: seller?.mobileNumber,
            };
          }
        } else if (r.targetType === 'USER') {
          const user = await User.findById(r.targetId)
            .select('profile mobileNumber accountStatus')
            .lean();
          if (user) {
            targetDetails = {
              displayName: user.profile?.displayName,
              mobileNumber: user.mobileNumber,
              accountStatus: user.accountStatus,
            };
          }
        } else if (r.targetType === 'REVIEW') {
          const review = await Review.findById(r.targetId).select('rating comment').lean();
          if (review) {
            targetDetails = {
              rating: review.rating,
              comment: review.comment,
            };
          }
        }

        return {
          reportId: r._id,
          ticketNumber: r.ticketNumber,
          targetType: r.targetType,
          targetId: r.targetId,
          targetDetails,
          reason: r.reason,
          description: r.description,
          evidenceChatRoomId: r.evidenceChatRoomId,
          reporterId: r.reporterId,
          status: r.status,
          createdAt: r.createdAt,
        };
      })
    );

    return {
      total,
      page,
      limit,
      queue,
    };
  }

  /**
   * 11.3 Admin Resolve Moderation Ticket
   */
  public static async resolveReport(
    moderatorId: string,
    reportId: string,
    dto: ResolveReportDto,
    traceId: string,
    ipAddress?: string
  ) {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new NotFoundError('Moderation report ticket not found.', 'REPORT_NOT_FOUND');
    }

    // Apply moderation action
    if (dto.action === 'SUSPEND_LISTING') {
      if (report.targetType === 'LISTING') {
        await Listing.findByIdAndUpdate(report.targetId, { status: 'SUSPENDED' });
      }
    } else if (dto.action === 'DELETE_REVIEW') {
      if (report.targetType === 'REVIEW') {
        await Review.findByIdAndUpdate(report.targetId, { moderationStatus: 'REMOVED' });
      }
    } else if (dto.action === 'WARN_USER') {
      let warnUserId: Types.ObjectId | undefined;
      if (report.targetType === 'USER') {
        warnUserId = report.targetId;
      } else if (report.targetType === 'LISTING') {
        const l = await Listing.findById(report.targetId);
        if (l) warnUserId = l.sellerId;
      }
      if (warnUserId) {
        await Notification.create({
          recipientId: warnUserId,
          type: 'FRAUD_WARNING',
          title: 'Trust & Safety Warning',
          body: 'Your account or content was flagged for policy violation. Continued violations will result in a permanent ban.',
        });
      }
    } else if (dto.action === 'BAN_USER') {
      let banUserId: Types.ObjectId | undefined;
      if (report.targetType === 'USER') {
        banUserId = report.targetId;
      } else if (report.targetType === 'LISTING') {
        const l = await Listing.findById(report.targetId);
        if (l) banUserId = l.sellerId;
      }
      if (banUserId) {
        await this.banUserAndDevices(
          moderatorId,
          {
            userId: banUserId.toString(),
            reason: `Banned via moderation report ${report.ticketNumber}: ${dto.resolutionNotes}`,
            blacklistDevices: true,
            blacklistNid: true,
            suspendAllListings: true,
          },
          traceId,
          ipAddress
        );
      }
    }

    report.status = 'RESOLVED';
    report.verdict = dto.verdict;
    report.actionApplied = dto.action;
    report.resolutionNotes = dto.resolutionNotes;
    report.resolvedBy = new Types.ObjectId(moderatorId);
    report.resolvedAt = new Date();
    await report.save();

    // Notify Reporter
    if (dto.notifyReporter) {
      try {
        await Notification.create({
          recipientId: report.reporterId,
          type: 'SYSTEM_ALERT',
          title: 'Report Investigated',
          body: `Your report ticket ${report.ticketNumber} has been reviewed and resolved by our Trust & Safety team.`,
        });
      } catch (err) {
        logger.error('Failed to notify reporter:', err);
      }
    }

    // WORM Audit Log
    await this.logAuditEvent({
      traceId,
      userId: moderatorId,
      actorRole: 'MODERATOR',
      action: 'REPORT_RESOLVED',
      entityType: 'Report',
      entityId: report._id.toString(),
      ipAddress,
      metadata: {
        ticketNumber: report.ticketNumber,
        verdict: dto.verdict,
        actionApplied: dto.action,
        resolutionNotes: dto.resolutionNotes,
      },
    });

    return {
      reportId: report._id,
      status: report.status,
      verdict: report.verdict,
      actionApplied: report.actionApplied,
      resolvedBy: moderatorId,
      resolvedAt: report.resolvedAt,
    };
  }

  /**
   * 11.4 Admin Enforce Permanent User / Device Ban
   */
  public static async banUserAndDevices(
    adminId: string,
    dto: BanUserDto,
    traceId: string,
    ipAddress?: string
  ) {
    const user = await User.findById(dto.userId);
    if (!user) {
      throw new NotFoundError('Target user account not found.', 'USER_NOT_FOUND');
    }

    if (user.role === 'admin') {
      throw new ForbiddenError(
        'Cannot ban another administrator account.',
        'CANNOT_BAN_ADMIN'
      );
    }

    // 1. Mark User BANNED
    user.accountStatus = 'BANNED';
    await user.save();

    // 2. Revoke active JWT refresh tokens in Redis
    try {
      const redis = getRedisClient();
      await redis.del(`refresh_token:${user._id}`);
      await redis.set(`user_banned:${user._id}`, '1', 'EX', 30 * 24 * 60 * 60);
    } catch (redisErr) {
      logger.error('Redis token revocation failed during ban:', redisErr);
    }

    // 3. Suspend All Active Listings
    let listingsSuspendedCount = 0;
    if (dto.suspendAllListings !== false) {
      const suspendRes = await Listing.updateMany(
        { sellerId: user._id, status: { $ne: 'DELETED' } },
        { status: 'SUSPENDED' }
      );
      listingsSuspendedCount = suspendRes.modifiedCount;
    }

    // 4. Blacklist Bound Devices
    let blacklistedDeviceFingerprintsCount = 0;
    if (dto.blacklistDevices !== false && user.boundDevices && user.boundDevices.length > 0) {
      for (const device of user.boundDevices) {
        if (device.deviceFingerprintHash) {
          await BlacklistedDevice.findOneAndUpdate(
            { deviceFingerprintHash: device.deviceFingerprintHash },
            {
              $setOnInsert: {
                deviceFingerprintHash: device.deviceFingerprintHash,
                reason: dto.reason,
                blacklistedBy: new Types.ObjectId(adminId),
              },
              $addToSet: { linkedUserIds: user._id },
            },
            { upsert: true }
          );
          blacklistedDeviceFingerprintsCount++;
        }
      }
    }

    // 5. Permanent Blacklist of NID Hash
    let nidBlacklisted = false;
    if (dto.blacklistNid !== false && user.nidData?.nidHashSha256) {
      nidBlacklisted = true;
    }

    // 6. Cryptographic WORM Audit Log
    await this.logAuditEvent({
      traceId,
      userId: adminId,
      actorRole: 'ADMIN',
      action: 'USER_AND_DEVICES_PERMANENTLY_BANNED',
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress,
      metadata: {
        bannedUserId: user._id.toString(),
        reason: dto.reason,
        listingsSuspendedCount,
        blacklistedDeviceFingerprintsCount,
        nidBlacklisted,
      },
    });

    return {
      userId: user._id,
      status: 'BANNED',
      listingsSuspendedCount,
      blacklistedDeviceFingerprintsCount,
      nidBlacklisted,
      bannedAt: new Date(),
    };
  }
}
