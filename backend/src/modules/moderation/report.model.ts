import { Schema, model, Document, Types } from 'mongoose';

export type ReportTargetType = 'USER' | 'LISTING' | 'REVIEW';
export type ReportReason =
  | 'FRAUD'
  | 'SCAM'
  | 'OFFENSIVE_CONTENT'
  | 'FAKE_LISTING'
  | 'ABUSE'
  | 'COUNTERFEIT_ITEM';
export type ReportStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
export type ReportVerdict = 'ACTION_TAKEN' | 'DISMISSED' | 'FALSE_REPORT';
export type ReportActionApplied =
  | 'SUSPEND_LISTING'
  | 'DELETE_REVIEW'
  | 'WARN_USER'
  | 'BAN_USER'
  | 'NO_ACTION';

export interface IReportDocument extends Document {
  _id: Types.ObjectId;
  ticketNumber: string;
  reporterId: Types.ObjectId;
  targetType: ReportTargetType;
  targetId: Types.ObjectId;
  reason: ReportReason;
  description?: string;
  evidenceChatRoomId?: string;
  status: ReportStatus;
  verdict?: ReportVerdict;
  actionApplied?: ReportActionApplied;
  resolutionNotes?: string;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReportDocument>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['USER', 'LISTING', 'REVIEW'],
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: [
        'FRAUD',
        'SCAM',
        'OFFENSIVE_CONTENT',
        'FAKE_LISTING',
        'ABUSE',
        'COUNTERFEIT_ITEM',
      ],
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    evidenceChatRoomId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'],
      default: 'SUBMITTED',
      index: true,
    },
    verdict: {
      type: String,
      enum: ['ACTION_TAKEN', 'DISMISSED', 'FALSE_REPORT'],
    },
    actionApplied: {
      type: String,
      enum: ['SUSPEND_LISTING', 'DELETE_REVIEW', 'WARN_USER', 'BAN_USER', 'NO_ACTION'],
    },
    resolutionNotes: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, targetId: 1 });

export const Report = model<IReportDocument>('Report', ReportSchema);
export default Report;
