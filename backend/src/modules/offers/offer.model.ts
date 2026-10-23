import { Schema, model, Document, Types } from 'mongoose';

export type OfferStatus =
  | 'PENDING'
  | 'COUNTERED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | 'VOIDED';

export interface IOfferHistory {
  action: 'SUBMITTED' | 'COUNTERED' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'VOIDED';
  actorId: Types.ObjectId;
  price?: number;
  timestamp: Date;
}

export interface IOfferDocument extends Document {
  _id: Types.ObjectId;
  listingId: Types.ObjectId;
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  offeredPrice: number;
  currency: string;
  counterPrice?: number;
  status: OfferStatus;
  history: IOfferHistory[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OfferHistorySchema = new Schema<IOfferHistory>(
  {
    action: {
      type: String,
      enum: ['SUBMITTED', 'COUNTERED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'VOIDED'],
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    price: {
      type: Number,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const OfferSchema = new Schema<IOfferDocument>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    offeredPrice: {
      type: Number,
      required: true,
      min: [1, 'Offered price must be at least 1 BDT'],
    },
    currency: {
      type: String,
      default: 'BDT',
      uppercase: true,
    },
    counterPrice: {
      type: Number,
      min: [1, 'Counter price must be positive'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'COUNTERED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED', 'VOIDED'],
      default: 'PENDING',
      index: true,
    },
    history: {
      type: [OfferHistorySchema],
      default: [],
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours TTL
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound Indexes for Negotiation State & Quotas
OfferSchema.index({ listingId: 1, buyerId: 1, status: 1 });
OfferSchema.index({ sellerId: 1, status: 1 });
OfferSchema.index({ buyerId: 1, createdAt: -1 });

export const Offer = model<IOfferDocument>('Offer', OfferSchema);
export default Offer;
