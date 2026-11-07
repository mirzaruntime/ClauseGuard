import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import type { ReminderChannel } from '../types';
import { User } from '../models/User';
import { Contract } from '../models/Contract';
import { sendReminderEmail } from './email.service';
import { env } from '../config/env';

export interface NotificationPayload {
  ownerId: string;
  reminderId: string;
  obligationId: string;
  contractId: string;
  obligationTitle: string;
  deadline: Date | null;
  message: string | null;
  reminderDate?: Date;
}

export interface NotificationChannel {
  readonly name: ReminderChannel;
  deliver(payload: NotificationPayload): Promise<void>;
}

/**
 * Writes non-content delivery metadata to the structured log stream.
 *
 * This is a real, working delivery channel suitable for log-drain based
 * notification setups and is the default reminder channel.
 */
const logChannel: NotificationChannel = {
  name: 'log',
  async deliver(payload) {
    logger.info('reminder.delivered', {
      channel: 'log',
      reminderId: payload.reminderId,
      obligationId: payload.obligationId,
      ownerId: payload.ownerId,
      deadline: payload.deadline?.toISOString() ?? null,
    });
  },
};

const emailChannel: NotificationChannel = {
  name: 'email',
  async deliver(payload) {
    // Resolve recipient and contract through the reminder owner. No request
    // supplied address or cross-owner contract data is used for delivery.
    const [owner, contract] = await Promise.all([
      User.findById(payload.ownerId).select('email').lean(),
      Contract.findOne({ _id: payload.contractId, ownerId: payload.ownerId })
        .select('title')
        .lean(),
    ]);

    if (!owner || typeof owner.email !== 'string' || !owner.email.trim()) {
      throw ApiError.badRequest('Reminder owner has no valid email address', 'REMINDER_RECIPIENT_INVALID');
    }

    await sendReminderEmail({
      to: owner.email,
      obligationTitle: payload.obligationTitle,
      message: payload.message,
      contractTitle: contract?.title ?? null,
      deadline: payload.deadline,
      reminderDate: payload.reminderDate ?? null,
      reminderUrl: contract && env.FRONTEND_URL
        ? new URL(`/contracts/${encodeURIComponent(String(contract._id))}`, env.FRONTEND_URL).toString()
        : null,
    });
  },
};

const channels = new Map<ReminderChannel, NotificationChannel>([
  [logChannel.name, logChannel],
]);

if (env.EMAIL_ENABLED && env.RESEND_API_KEY && env.EMAIL_FROM) {
  channels.set(emailChannel.name, emailChannel);
}

/** Registers an additional channel (for example an email transport). */
export function registerChannel(channel: NotificationChannel): void {
  channels.set(channel.name, channel);
}

export function isChannelAvailable(channel: ReminderChannel): boolean {
  return channels.has(channel);
}

export async function deliverNotification(
  channel: ReminderChannel,
  payload: NotificationPayload,
): Promise<void> {
  const target = channels.get(channel);
  if (!target) {
    throw ApiError.serviceUnavailable(
      `Notification channel "${channel}" is not configured on this server`,
      'CHANNEL_NOT_CONFIGURED',
    );
  }
  await target.deliver(payload);
}
