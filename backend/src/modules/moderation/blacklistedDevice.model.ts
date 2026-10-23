import { Schema, model, Document, Types } from 'mongoose';

export interface IBlacklistedDeviceDocument extends Document {
  _id: Types.ObjectId;
  deviceFingerprintHash: string;
  reason: string;
  blacklistedBy?: Types.ObjectId;
  linkedUserIds: Types.ObjectId[];
  createdAt: Date;
}

const BlacklistedDeviceSchema = new Schema<IBlacklistedDeviceDocument>(
  {
    deviceFingerprintHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    blacklistedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    linkedUserIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
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

export const BlacklistedDevice = model<IBlacklistedDeviceDocument>(
  'BlacklistedDevice',
  BlacklistedDeviceSchema
);
export default BlacklistedDevice;
