import crypto from 'crypto';
import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLogDocument extends Document {
  _id: Types.ObjectId;
  traceId: string;
  userId?: Types.ObjectId;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | string;
  ipAddress?: string;
  userAgent?: string;
  previousHash: string;
  currentHash: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    traceId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    previousHash: {
      type: String,
      required: true,
    },
    currentHash: {
      type: String,
      required: true,
      unique: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// Cryptographic hash calculation utility for WORM immutability
export const computeAuditHash = (
  previousHash: string,
  payload: {
    traceId: string;
    userId?: string | Types.ObjectId;
    action: string;
    entityType: string;
    entityId?: string | Types.ObjectId;
    metadata?: unknown;
    timestamp: Date | string;
  }
): string => {
  const serialized = `${previousHash}|${payload.traceId}|${payload.userId || ''}|${payload.action}|${payload.entityType}|${payload.entityId || ''}|${JSON.stringify(payload.metadata || {})}|${new Date(payload.timestamp).toISOString()}`;
  return crypto.createHash('sha256').update(serialized).digest('hex');
};

// Compound Indexes for Legal & Moderation Queries
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

export const AuditLog = model<IAuditLogDocument>('AuditLog', AuditLogSchema);
export default AuditLog;
