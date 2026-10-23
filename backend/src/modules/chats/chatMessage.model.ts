import { Schema, model, Document, Types } from 'mongoose';

export type MessageType = 'TEXT' | 'IMAGE' | 'MEETUP_PIN' | 'SYSTEM_WARNING';

export interface IChatMessageDocument extends Document {
  _id: Types.ObjectId;
  roomId: string;
  listingId: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  messageType: MessageType;
  content: string;
  attachmentUrl?: string;
  isScamFlagged: boolean;
  scamKeywordTriggered?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessageDocument>(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'MEETUP_PIN', 'SYSTEM_WARNING'],
      default: 'TEXT',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    attachmentUrl: {
      type: String,
    },
    isScamFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    scamKeywordTriggered: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// Indexes for Fast Real-Time History & Anti-Fraud Auditing
ChatMessageSchema.index({ roomId: 1, createdAt: 1 });
ChatMessageSchema.index({ senderId: 1, recipientId: 1 });
ChatMessageSchema.index({ recipientId: 1, isRead: 1 });

export const ChatMessage = model<IChatMessageDocument>('ChatMessage', ChatMessageSchema);
export default ChatMessage;
