import { Schema, model, Document, Types } from 'mongoose';

export type PaymentGateway = 'BKASH' | 'NAGAD' | 'ROCKET' | 'SSLCOMMERZ';
export type PaymentStatus = 'INITIATED' | 'PAID' | 'FAILED' | 'CANCELLED';
export type BoostType =
  | 'TOP_AD_3D'
  | 'TOP_AD_7D'
  | 'TOP_AD_15D'
  | 'BUMP_UP'
  | 'STOREFRONT_TIER_BASIC'
  | 'STOREFRONT_TIER_PRO';

export interface IPaymentDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  listingId?: Types.ObjectId;
  storefrontId?: Types.ObjectId;
  transactionRef: string;
  gatewayTransactionId?: string;
  gateway: PaymentGateway;
  method?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  boostType: BoostType;
  durationDays?: number;
  paymentMetadata?: Record<string, unknown>;
  paidAt?: Date;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      index: true,
    },
    storefrontId: {
      type: Schema.Types.ObjectId,
      ref: 'Storefront',
      index: true,
    },
    transactionRef: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    gatewayTransactionId: {
      type: String,
      trim: true,
      index: true,
    },
    gateway: {
      type: String,
      enum: ['BKASH', 'NAGAD', 'ROCKET', 'SSLCOMMERZ'],
      required: true,
    },
    method: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be positive'],
    },
    currency: {
      type: String,
      default: 'BDT',
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['INITIATED', 'PAID', 'FAILED', 'CANCELLED'],
      default: 'INITIATED',
      index: true,
    },
    boostType: {
      type: String,
      enum: [
        'TOP_AD_3D',
        'TOP_AD_7D',
        'TOP_AD_15D',
        'BUMP_UP',
        'STOREFRONT_TIER_BASIC',
        'STOREFRONT_TIER_PRO',
      ],
      required: true,
    },
    durationDays: {
      type: Number,
    },
    paymentMetadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    paidAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

PaymentSchema.index({ userId: 1, createdAt: -1 });

export const Payment = model<IPaymentDocument>('Payment', PaymentSchema);
export default Payment;
