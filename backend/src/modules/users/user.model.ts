import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = 'buyer' | 'seller' | 'merchant' | 'moderator' | 'admin' | 'legal_officer';
export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface IBoundDevice {
  deviceFingerprintHash: string;
  deviceModel?: string;
  lastIpAddress?: string;
  boundAt: Date;
}

export interface INidData {
  nidNumberEncrypted?: string;
  nidHashSha256?: string;
  fullNameBangla?: string;
  fullNameEnglish?: string;
  dateOfBirth?: string;
  verifiedAt?: Date;
}

export interface IUserProfile {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  division?: string;
  district?: string;
  thana?: string;
}

export interface IUserDocument extends Document {
  _id: Types.ObjectId;
  mobileNumber: string;
  passwordHash?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  isNidVerified: boolean;
  nidData?: INidData;
  profile: IUserProfile;
  boundDevices: IBoundDevice[];
  savedListings: Types.ObjectId[];
  ratingAverage: number;
  ratingCount: number;
  dailyAdCount: number;
  lastAdPostedAt?: Date;
  fcmToken?: string;
  devicePlatform?: 'ANDROID' | 'IOS' | 'WEB';
  createdAt: Date;
  updatedAt: Date;
}

const BoundDeviceSchema = new Schema<IBoundDevice>(
  {
    deviceFingerprintHash: { type: String, required: true },
    deviceModel: { type: String },
    lastIpAddress: { type: String },
    boundAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const NidDataSchema = new Schema<INidData>(
  {
    nidNumberEncrypted: { type: String },
    nidHashSha256: { type: String },
    fullNameBangla: { type: String },
    fullNameEnglish: { type: String },
    dateOfBirth: { type: String },
    verifiedAt: { type: Date },
  },
  { _id: false }
);

const UserProfileSchema = new Schema<IUserProfile>(
  {
    displayName: { type: String, trim: true, default: 'Member' },
    avatarUrl: { type: String },
    bio: { type: String, maxlength: 500 },
    division: { type: String },
    district: { type: String },
    thana: { type: String },
  },
  { _id: false }
);

const UserSchema = new Schema<IUserDocument>(
  {
    mobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^01[3-9]\d{8}$/, 'Please provide a valid 11-digit Bangladeshi mobile number'],
    },
    passwordHash: {
      type: String,
      select: false,
    },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'merchant', 'moderator', 'admin', 'legal_officer'],
      default: 'buyer',
      required: true,
    },
    accountStatus: {
      type: String,
      enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED'],
      default: 'ACTIVE',
      required: true,
    },
    isNidVerified: {
      type: Boolean,
      default: false,
      required: true,
    },
    nidData: {
      type: NidDataSchema,
      default: {},
    },
    profile: {
      type: UserProfileSchema,
      default: () => ({ displayName: 'Member' }),
    },
    boundDevices: {
      type: [BoundDeviceSchema],
      default: [],
    },
    savedListings: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Listing' }],
      default: [],
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dailyAdCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastAdPostedAt: {
      type: Date,
    },
    fcmToken: {
      type: String,
    },
    devicePlatform: {
      type: String,
      enum: ['ANDROID', 'IOS', 'WEB'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound & Secondary Indexes
UserSchema.index({ 'nidData.nidHashSha256': 1 }, { unique: true, sparse: true });
UserSchema.index({ 'boundDevices.deviceFingerprintHash': 1 });
UserSchema.index({ accountStatus: 1, role: 1 });
UserSchema.index({ ratingAverage: -1 });

export const User = model<IUserDocument>('User', UserSchema);
export default User;
