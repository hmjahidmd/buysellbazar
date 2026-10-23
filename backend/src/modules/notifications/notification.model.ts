import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'OFFER_RECEIVED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_COUNTERED'
  | 'NEW_MESSAGE'
  | 'KYC_VERIFIED'
  | 'KYC_REJECTED'
  | 'BOOST_ACTIVATED'
  | 'FRAUD_WARNING'
  | 'REVIEW_RECEIVED'
  | 'REVIEW_REPLIED'
  | 'SYSTEM_ALERT';

export interface INotificationDocument extends Document {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: Types.ObjectId | string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'OFFER_RECEIVED',
        'OFFER_ACCEPTED',
        'OFFER_COUNTERED',
        'NEW_MESSAGE',
        'KYC_VERIFIED',
        'KYC_REJECTED',
        'BOOST_ACTIVATED',
        'FRAUD_WARNING',
        'REVIEW_RECEIVED',
        'REVIEW_REPLIED',
        'SYSTEM_ALERT',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 120,
    },
    body: {
      type: String,
      required: true,
      maxlength: 500,
    },
    entityType: {
      type: String,
    },
    entityId: {
      type: Schema.Types.Mixed,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      expires: 60 * 24 * 60 * 60, // TTL: Auto-expire after 60 days
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotificationDocument>('Notification', NotificationSchema);
export default Notification;
