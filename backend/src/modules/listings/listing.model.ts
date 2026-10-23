import { Schema, model, Document, Types } from 'mongoose';

export type ListingCondition = 'BRAND_NEW' | 'LIKE_NEW' | 'USED' | 'FOR_PARTS';
export type ListingStatus = 'ACTIVE' | 'HOLD' | 'SOLD' | 'EXPIRED' | 'SUSPENDED' | 'DELETED';

export interface IListingImage {
  url: string;
  thumbnailUrl?: string;
  perceptualHash?: string;
  isPrimary?: boolean;
}

export interface IListingLocation {
  division: string;
  district: string;
  thana: string;
  geoCoordinates?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface IListingBoost {
  isTopAd: boolean;
  topAdExpiresAt?: Date;
  isBumped: boolean;
  bumpedAt?: Date;
}

export interface IListingMetrics {
  viewsCount: number;
  chatLeadsCount: number;
  offerCount: number;
}

export interface IListingDocument extends Document {
  _id: Types.ObjectId;
  sellerId: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  subCategory?: string;
  price: number;
  isNegotiable: boolean;
  condition: ListingCondition;
  location: IListingLocation;
  images: IListingImage[];
  status: ListingStatus;
  boost: IListingBoost;
  metrics: IListingMetrics;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ListingImageSchema = new Schema<IListingImage>(
  {
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    perceptualHash: { type: String },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const ListingLocationSchema = new Schema<IListingLocation>(
  {
    division: { type: String, required: true },
    district: { type: String, required: true },
    thana: { type: String, required: true },
    geoCoordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [90.4125, 23.8103], // Dhaka center default
      },
    },
  },
  { _id: false }
);

const ListingBoostSchema = new Schema<IListingBoost>(
  {
    isTopAd: { type: Boolean, default: false, index: true },
    topAdExpiresAt: { type: Date },
    isBumped: { type: Boolean, default: false },
    bumpedAt: { type: Date },
  },
  { _id: false }
);

const ListingMetricsSchema = new Schema<IListingMetrics>(
  {
    viewsCount: { type: Number, default: 0, min: 0 },
    chatLeadsCount: { type: Number, default: 0, min: 0 },
    offerCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const ListingSchema = new Schema<IListingDocument>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      maxlength: 3000,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    subCategory: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price must be positive'],
      index: true,
    },
    isNegotiable: {
      type: Boolean,
      default: false,
    },
    condition: {
      type: String,
      enum: ['BRAND_NEW', 'LIKE_NEW', 'USED', 'FOR_PARTS'],
      required: true,
    },
    location: {
      type: ListingLocationSchema,
      required: true,
    },
    images: {
      type: [ListingImageSchema],
      validate: [(val: IListingImage[]) => val.length <= 10, 'Maximum 10 images allowed'],
      default: [],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'HOLD', 'SOLD', 'EXPIRED', 'SUSPENDED', 'DELETED'],
      default: 'ACTIVE',
      index: true,
    },
    boost: {
      type: ListingBoostSchema,
      default: () => ({ isTopAd: false, isBumped: false }),
    },
    metrics: {
      type: ListingMetricsSchema,
      default: () => ({ viewsCount: 0, chatLeadsCount: 0, offerCount: 0 }),
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// High Performance Composite & Search Indexes
ListingSchema.index({ status: 1, category: 1, 'location.district': 1, price: 1 });
ListingSchema.index({ sellerId: 1, createdAt: -1 });
ListingSchema.index({ 'boost.isTopAd': -1, 'boost.bumpedAt': -1, createdAt: -1 });
ListingSchema.index({ 'location.geoCoordinates': '2dsphere' });
ListingSchema.index(
  { title: 'text', description: 'text' },
  { weights: { title: 10, description: 3 }, name: 'ListingTextIndex' }
);

export const Listing = model<IListingDocument>('Listing', ListingSchema);
export default Listing;
