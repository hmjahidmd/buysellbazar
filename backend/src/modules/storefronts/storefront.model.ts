import { Schema, model, Document, Types } from 'mongoose';

export type StorefrontTier = 'BASIC' | 'PRO' | 'PLATINUM' | 'ENTERPRISE';
export type StorefrontStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';

export interface IStorefrontContact {
  officialPhone?: string;
  officialEmail?: string;
  physicalStoreAddress?: string;
  websiteUrl?: string;
}

export interface IStorefrontAddress {
  division: string;
  district: string;
  thana: string;
  streetAddress?: string;
}

export interface IStorefrontDocument extends Document {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  storeName: string;
  storeSlug: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  businessCategory?: string;
  tradeLicenseNumber?: string;
  isLicenseVerified: boolean;
  tier: StorefrontTier;
  quotaLimit: number;
  subscriptionExpiresAt: Date;
  gracePeriodExpiresAt: Date;
  status: StorefrontStatus;
  contact?: IStorefrontContact;
  address?: IStorefrontAddress;
  createdAt: Date;
  updatedAt: Date;
}

const StorefrontContactSchema = new Schema<IStorefrontContact>(
  {
    officialPhone: { type: String },
    officialEmail: { type: String },
    physicalStoreAddress: { type: String },
    websiteUrl: { type: String },
  },
  { _id: false }
);

const StorefrontAddressSchema = new Schema<IStorefrontAddress>(
  {
    division: { type: String },
    district: { type: String },
    thana: { type: String },
    streetAddress: { type: String },
  },
  { _id: false }
);

const StorefrontSchema = new Schema<IStorefrontDocument>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    storeSlug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
      index: true,
    },
    tagline: {
      type: String,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    logoUrl: {
      type: String,
    },
    bannerUrl: {
      type: String,
    },
    businessCategory: {
      type: String,
    },
    tradeLicenseNumber: {
      type: String,
    },
    isLicenseVerified: {
      type: Boolean,
      default: false,
    },
    tier: {
      type: String,
      enum: ['BASIC', 'PRO', 'PLATINUM', 'ENTERPRISE'],
      default: 'BASIC',
      required: true,
    },
    quotaLimit: {
      type: Number,
      default: 100,
      min: 1,
    },
    subscriptionExpiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    gracePeriodExpiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // 30d + 5d grace
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    contact: {
      type: StorefrontContactSchema,
    },
    address: {
      type: StorefrontAddressSchema,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

StorefrontSchema.index({ status: 1, tier: 1 });

export const Storefront = model<IStorefrontDocument>('Storefront', StorefrontSchema);
export default Storefront;
