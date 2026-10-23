import crypto from 'crypto';
import { Types } from 'mongoose';
import { ChatMessage, IChatMessageDocument, MessageType } from './chatMessage.model';
import { Listing } from '../listings/listing.model';
import { User } from '../users/user.model';
import { Notification } from '../notifications/notification.model';
import { AuditLog, computeAuditHash } from '../moderation/auditLog.model';
import { getRedisClient } from '../../config/redis';
import logger from '../../config/logger';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../core/errors/AppError';

export const SCAM_REGEX =
  /(bkash|nagad|rocket)\s*(advance|agrim|charge|delivery\s*fee|courier|fee|pathan|taka\s*pathan)|(courier\s*(charge|fee))|(advance\s*(fee|charge|taka))|(কুরিয়ার\s*চার্জ|অগ্রিম|বিকাশ\s*করুন)/i;

export const SCAM_WARNING_MESSAGE =
  '⚠️ সতর্কতা: কোনো পণ্য বা কুরিয়ার ফি বাবদ অগ্রিম বিকাশ বা নগদ-এ টাকা পাঠাবেন না। পণ্য সামনাসামনি দেখে যাচাই করে লেনদেন করুন।';

export class ChatService {
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
      logger.error('Failed to log chat audit event: ', auditErr);
    }
  }

  /**
   * 7.1 Get User Chat Inbox (Active Conversations)
   */
  public static async getUserInbox(userId: string, page = 1, limit = 20) {
    const userObjectId = new Types.ObjectId(userId);

    // Aggregate unique roomIds where user was sender or recipient
    const rooms = await ChatMessage.aggregate([
      {
        $match: {
          $or: [{ senderId: userObjectId }, { recipientId: userObjectId }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: '$roomId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipientId', userObjectId] },
                    { $eq: ['$isRead', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    // Populate counterparts and listings
    const inbox = await Promise.all(
      rooms.map(async (room) => {
        const lastMsg = room.lastMessage;
        const counterpartId = lastMsg.senderId.equals(userObjectId)
          ? lastMsg.recipientId
          : lastMsg.senderId;

        const [counterpart, listing] = await Promise.all([
          User.findById(counterpartId).select('profile.displayName profile.avatarUrl isNidVerified'),
          Listing.findById(lastMsg.listingId).select('title price images status'),
        ]);

        return {
          roomId: room._id,
          listing: listing || null,
          counterpart: counterpart || { displayName: 'User', isNidVerified: false },
          lastMessage: {
            content: lastMsg.content,
            messageType: lastMsg.messageType,
            isScamFlagged: lastMsg.isScamFlagged,
            createdAt: lastMsg.createdAt,
            senderId: lastMsg.senderId,
          },
          unreadCount: room.unreadCount,
        };
      })
    );

    return {
      total: rooms.length,
      page,
      limit,
      inbox,
    };
  }

  /**
   * 7.2 Initiate or Fetch Chat Room for Listing
   */
  public static async startOrGetRoom(userId: string, listingId: string) {
    const listing = await Listing.findById(listingId).populate(
      'sellerId',
      'profile.displayName profile.avatarUrl isNidVerified ratingAverage ratingCount'
    );

    if (!listing || listing.status === 'DELETED') {
      throw new NotFoundError('Listing not found or has been removed');
    }

    if (listing.sellerId._id.equals(userId)) {
      throw new BadRequestError('You cannot start a chat room with yourself.');
    }

    // Security Gate: Buyer must be e-KYC verified to start conversations
    const buyer = await User.findById(userId);
    if (!buyer || !buyer.isNidVerified) {
      throw new ForbiddenError(
        'Government identity verification required before contacting sellers. Please complete e-KYC clearance.',
        'NID_VERIFICATION_REQUIRED'
      );
    }

    const roomId = `room_${listing._id.toString()}_${userId}`;

    // Increment chat lead metric for seller
    await Listing.findByIdAndUpdate(listing._id, { $inc: { 'metrics.chatLeadsCount': 1 } });

    return {
      roomId,
      listing: {
        listingId: listing._id.toString(),
        title: listing.title,
        price: listing.price,
        images: listing.images,
        status: listing.status,
      },
      seller: listing.sellerId,
    };
  }

  /**
   * 7.3 Get Message History & Atomically Mark As Read
   */
  public static async getMessageHistory(userId: string, roomId: string, page = 1, limit = 50) {
    const userObjectId = new Types.ObjectId(userId);
    const skip = (page - 1) * limit;

    const [total, messages] = await Promise.all([
      ChatMessage.countDocuments({ roomId }),
      ChatMessage.find({ roomId })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Mark unread messages as read
    await ChatMessage.updateMany(
      { roomId, recipientId: userObjectId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return {
      roomId,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      messages,
    };
  }

  /**
   * 7.4 Send In-Chat Message (HTTP Fallback + Anti-Scam Shield Interception)
   */
  public static async sendMessage(params: {
    senderId: string;
    roomId: string;
    content: string;
    messageType?: MessageType;
    attachmentUrl?: string;
    clientIp: string;
    traceId: string;
  }): Promise<{ message: IChatMessageDocument; warningMessage?: IChatMessageDocument }> {
    const { senderId, roomId, content, messageType = 'TEXT', attachmentUrl, clientIp, traceId } = params;

    // Resolve Listing ID & Buyer ID from composite room ID (`room_<listingId>_<buyerId>`)
    const parts = roomId.split('_');
    if (parts.length < 3) {
      throw new BadRequestError('Invalid roomId format');
    }

    const listingId = parts[1];
    const buyerId = parts[2];

    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new NotFoundError('Associated listing not found');
    }

    const recipientId = senderId === buyerId ? listing.sellerId.toString() : buyerId;

    // 1. Anti-Scam Regex Keyword Inspection
    const scamMatch = content.match(SCAM_REGEX);
    const isScamFlagged = Boolean(scamMatch);
    const scamKeywordTriggered = scamMatch ? scamMatch[0] : undefined;

    // 2. Persist Message
    const message = new ChatMessage({
      roomId,
      listingId: new Types.ObjectId(listingId),
      senderId: new Types.ObjectId(senderId),
      recipientId: new Types.ObjectId(recipientId),
      messageType,
      content,
      attachmentUrl,
      isScamFlagged,
      scamKeywordTriggered,
      isRead: false,
    });

    await message.save();

    let warningMessage: IChatMessageDocument | undefined;

    // 3. Inject High-Risk System Warning if Scam Pattern Triggered
    if (isScamFlagged) {
      logger.warn(`[Anti-Scam Interception] Scam keyword [${scamKeywordTriggered}] triggered in room [${roomId}] by userId [${senderId}]`);

      warningMessage = new ChatMessage({
        roomId,
        listingId: new Types.ObjectId(listingId),
        senderId: new Types.ObjectId(senderId),
        recipientId: new Types.ObjectId(recipientId),
        messageType: 'SYSTEM_WARNING',
        content: SCAM_WARNING_MESSAGE,
        isScamFlagged: true,
        scamKeywordTriggered,
      });

      await warningMessage.save();

      // Log WORM Fraud Ticket (DF-18 / D8)
      await this.logAuditEvent({
        traceId,
        userId: senderId,
        actorRole: 'buyer_or_seller',
        action: 'CHAT_SCAM_KEYWORD_FLAGGED',
        entityType: 'CHAT_MESSAGE',
        entityId: message._id.toString(),
        ipAddress: clientIp,
        metadata: { scamKeywordTriggered, roomId, contentSnippet: content.slice(0, 100) },
      });
    }

    // 4. Notify Recipient if Offline
    try {
      const redis = getRedisClient();
      const isOnline = await redis.get(`presence:${recipientId}`);
      if (!isOnline) {
        await Notification.create({
          recipientId: new Types.ObjectId(recipientId),
          type: 'NEW_MESSAGE',
          title: 'New Chat Message',
          body: content.length > 60 ? `${content.slice(0, 60)}...` : content,
          entityType: 'CHAT',
          entityId: roomId,
        });
      }
    } catch (err) {
      logger.warn('Failed to check presence in Redis: ', err);
    }

    return { message, warningMessage };
  }
}

export default ChatService;
