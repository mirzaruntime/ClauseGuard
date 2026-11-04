import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import type { ReminderChannel, ReminderStatus } from '../types';

export const REMINDER_STATUSES: ReminderStatus[] = ['scheduled', 'sent', 'cancelled', 'failed'];
export const REMINDER_CHANNELS: ReminderChannel[] = ['log', 'email'];

export interface IReminder {
  obligationId: Types.ObjectId;
  contractId: Types.ObjectId;
  ownerId: Types.ObjectId;
  /** Always stored in UTC. */
  reminderDate: Date;
  status: ReminderStatus;
  channel: ReminderChannel;
  message?: string | null;
  /** Set atomically when the scheduler claims the reminder; prevents duplicate delivery. */
  claimedAt?: Date | null;
  sentAt?: Date | null;
  attempts: number;
  lastError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ReminderDocument = HydratedDocument<IReminder>;
export type ReminderModel = Model<IReminder>;

const reminderSchema = new Schema<IReminder, ReminderModel>(
  {
    obligationId: { type: Schema.Types.ObjectId, ref: 'Obligation', required: true, index: true },
    contractId: { type: Schema.Types.ObjectId, ref: 'Contract', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reminderDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: REMINDER_STATUSES,
      default: 'scheduled',
      index: true,
    },
    channel: { type: String, enum: REMINDER_CHANNELS, default: 'log' },
    message: { type: String, maxlength: 1000, default: null },
    claimedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    attempts: { type: Number, default: 0, min: 0 },
    lastError: { type: String, maxlength: 1000, default: null },
  },
  { timestamps: true },
);

reminderSchema.index({ status: 1, reminderDate: 1 });
reminderSchema.index({ ownerId: 1, reminderDate: 1 });
// One active reminder per obligation per timestamp; blocks accidental duplicates.
reminderSchema.index(
  { obligationId: 1, reminderDate: 1 },
  { unique: true, partialFilterExpression: { status: 'scheduled' } },
);

reminderSchema.set('toJSON', {
  transform: (_doc, raw) => {
    const ret = raw as unknown as Record<string, unknown>;
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Reminder = model<IReminder, ReminderModel>('Reminder', reminderSchema);
