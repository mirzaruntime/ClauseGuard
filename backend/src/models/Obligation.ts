import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import type { ObligationStatus } from '../types';

export const OBLIGATION_STATUSES: ObligationStatus[] = [
  'potential',
  'confirmed',
  'rejected',
  'completed',
  'overdue',
];

export interface IObligation {
  contractId: Types.ObjectId;
  ownerId: Types.ObjectId;
  title: string;
  description: string;
  status: ObligationStatus;
  /** Verbatim clause text the AI based the suggestion on. Preserved across edits. */
  sourceClause?: string | null;
  deadline?: Date | null;
  noticePeriod?: string | null;
  conditions: string[];
  /** AI provenance. Retained even after a human edits the obligation. */
  confidence?: number | null;
  aiExplanation?: string | null;
  aiGenerated: boolean;
  editedByUser: boolean;
  reviewedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ObligationDocument = HydratedDocument<IObligation>;
export type ObligationModel = Model<IObligation>;

const obligationSchema = new Schema<IObligation, ObligationModel>(
  {
    contractId: { type: Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 250 },
    description: { type: String, required: true, maxlength: 5000 },
    status: {
      type: String,
      required: true,
      enum: OBLIGATION_STATUSES,
      // AI suggestions are never auto-confirmed.
      default: 'potential',
      index: true,
    },
    sourceClause: { type: String, maxlength: 10_000, default: null },
    deadline: { type: Date, default: null, index: true },
    noticePeriod: { type: String, maxlength: 250, default: null },
    conditions: { type: [String], default: [] },
    confidence: { type: Number, min: 0, max: 1, default: null },
    aiExplanation: { type: String, maxlength: 5000, default: null },
    aiGenerated: { type: Boolean, default: false },
    editedByUser: { type: Boolean, default: false },
    reviewedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

obligationSchema.index({ ownerId: 1, status: 1 });
obligationSchema.index({ ownerId: 1, deadline: 1 });
obligationSchema.index({ contractId: 1, status: 1 });

obligationSchema.set('toJSON', {
  transform: (_doc, raw) => {
    const ret = raw as unknown as Record<string, unknown>;
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Obligation = model<IObligation, ObligationModel>('Obligation', obligationSchema);
