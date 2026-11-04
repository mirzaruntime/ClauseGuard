import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import type { ContractStatus } from '../types';

export const CONTRACT_STATUSES: ContractStatus[] = [
  'uploaded',
  'processing',
  'analyzing',
  'review',
  'completed',
  'failed',
];

export interface IContract {
  ownerId: Types.ObjectId;
  title: string;
  originalFileName: string;
  /** Storage key relative to UPLOAD_DIR. Absolute paths are never persisted or exposed. */
  fileReference: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  status: ContractStatus;
  pageCount?: number;
  extractedTextLength?: number;
  textTruncated: boolean;
  contractSummary?: string;
  parties: string[];
  obligationCount: number;
  analyzedAt?: Date;
  processingError?: {
    stage: 'extraction' | 'analysis' | 'persistence';
    code: string;
    message: string;
    occurredAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ContractDocument = HydratedDocument<IContract>;
export type ContractModel = Model<IContract>;

const contractSchema = new Schema<IContract, ContractModel>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    originalFileName: { type: String, required: true, maxlength: 255 },
    fileReference: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true, min: 1 },
    checksum: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: CONTRACT_STATUSES,
      default: 'uploaded',
      index: true,
    },
    pageCount: { type: Number, min: 0 },
    extractedTextLength: { type: Number, min: 0 },
    textTruncated: { type: Boolean, default: false },
    contractSummary: { type: String, maxlength: 5000 },
    parties: { type: [String], default: [] },
    obligationCount: { type: Number, default: 0, min: 0 },
    analyzedAt: { type: Date },
    processingError: {
      type: new Schema(
        {
          stage: { type: String, enum: ['extraction', 'analysis', 'persistence'], required: true },
          code: { type: String, required: true },
          message: { type: String, required: true },
          occurredAt: { type: Date, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true },
);

contractSchema.index({ ownerId: 1, createdAt: -1 });
contractSchema.index({ ownerId: 1, status: 1 });

contractSchema.set('toJSON', {
  transform: (_doc, raw) => {
    const ret = raw as unknown as Record<string, unknown>;
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    // The storage key is an internal detail and is never exposed to clients.
    delete ret.fileReference;
    return ret;
  },
});

export const Contract = model<IContract, ContractModel>('Contract', contractSchema);
