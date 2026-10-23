import { Schema, model, Document, Types } from 'mongoose';

export interface ISellerReply {
  comment: string;
  repliedAt: Date;
}

export interface IReviewDocument extends Document {
  _id: Types.ObjectId;
  offerId: Types.ObjectId;
  listingId: Types.ObjectId;
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  rating: number;
  comment: string;
  sellerReply?: ISellerReply;
  isEdited: boolean;
  editExpiresAt: Date;
  moderationStatus: 'CLEAN' | 'FLAGGED' | 'REMOVED';
  createdAt: Date;
  updatedAt: Date;
}

const SellerReplySchema = new Schema<ISellerReply>(
  {
    comment: { type: String, required: true, maxlength: 1000 },
    repliedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReviewSchema = new Schema<IReviewDocument>(
  {
    offerId: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
      required: true,
      unique: true, // Guarantees 1 review per verified transaction
      index: true,
    },
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
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
    },
    comment: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 1000,
    },
    sellerReply: {
      type: SellerReplySchema,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    moderationStatus: {
      type: String,
      enum: ['CLEAN', 'FLAGGED', 'REMOVED'],
      default: 'CLEAN',
      index: true,
    },
    editExpiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours SLA
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound Indexes for Reputation Aggregation
ReviewSchema.index({ sellerId: 1, createdAt: -1 });
ReviewSchema.index({ buyerId: 1, sellerId: 1 });

export const Review = model<IReviewDocument>('Review', ReviewSchema);
export default Review;
