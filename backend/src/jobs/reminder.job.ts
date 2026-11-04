import mongoose from 'mongoose';
import { Reminder, type ReminderDocument } from '../models/Reminder';
import { Obligation } from '../models/Obligation';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { deliverNotification } from '../services/notification.service';
import type { ReminderChannel } from '../types';

/** A claim older than this is treated as abandoned (process crashed mid-delivery). */
const CLAIM_TIMEOUT_MS = 5 * 60_000;

const SAFE_DELIVERY_ERROR_CODES = new Set([
  'EMAIL_CONFIGURATION_MISSING',
  'EMAIL_PROVIDER_NETWORK_FAILURE',
  'EMAIL_PROVIDER_TIMEOUT',
  'REMINDER_RECIPIENT_INVALID',
  'CHANNEL_NOT_CONFIGURED',
]);

const SAFE_PROVIDER_ERROR_CODES = new Set([
  'daily_quota_exceeded',
  'domain_not_verified',
  'invalid_api_key',
  'invalid_from_address',
  'invalid_to_address',
  'missing_api_key',
  'rate_limit_exceeded',
  'restricted_api_key',
  'validation_error',
]);

/** Return only allowlisted codes; never forward exception messages or stacks. */
function classifyDeliveryError(error: unknown): string {
  try {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      if (typeof code === 'string' && SAFE_DELIVERY_ERROR_CODES.has(code)) return code;
    }

    const message = error instanceof Error ? error.message : '';
    if (SAFE_DELIVERY_ERROR_CODES.has(message)) return message;

    const providerRejection = /^EMAIL_PROVIDER_REJECTED:([a-z0-9_]+)$/.exec(message);
    if (providerRejection && SAFE_PROVIDER_ERROR_CODES.has(providerRejection[1])) {
      return `EMAIL_PROVIDER_REJECTED:${providerRejection[1]}`;
    }
  } catch {
    // Thrown values can be arbitrary objects with unsafe or throwing accessors.
  }

  return 'UNEXPECTED_ERROR';
}

export interface DispatchSummary {
  claimed: number;
  sent: number;
  failed: number;
  retrying: number;
}

/**
 * Atomically claims one due reminder.
 *
 * The claim is a conditional update on `status: 'scheduled'`, so two workers
 * racing for the same document cannot both win - the loser gets null.
 */
async function claimNextDueReminder(now: Date): Promise<ReminderDocument | null> {
  const staleThreshold = new Date(now.getTime() - CLAIM_TIMEOUT_MS);

  // Root-cause fix for:
  //   CastError: Cast to date failed for value
  //     "{ '$lte': <Date> }" (type Object) at path "reminderDate"
  //
  // database.ts sets `mongoose.set('sanitizeFilter', true)` globally to block
  // NoSQL-injection from user-supplied HTTP request bodies.  That global option
  // runs inside Mongoose's _castConditions() for EVERY query and transforms any
  // filter value that contains MongoDB operators into `{ $eq: <original_value> }`:
  //
  //   reminderDate: { $lte: now }  →  reminderDate: { $eq: { $lte: now } }
  //
  // Mongoose then tries to cast { $lte: now } (a plain Object) as a Date for
  // reminderDate and throws.  Passing `sanitizeFilter: false` on the query
  // options is ineffective: Mongoose honours the global base option first.
  //
  // The correct escape-hatch is `mongoose.trusted()`, which attaches the
  // internal `trustedSymbol` to the value object; sanitizeFilter explicitly
  // skips values carrying that symbol.  This is a fully server-internal,
  // scheduler-only query with no user-controlled input, so it is safe to
  // bypass sanitization on these specific operator expressions.
  return Reminder.findOneAndUpdate(
    {
      status: 'scheduled',
      reminderDate: mongoose.trusted({ $lte: now }),
      $or: [{ claimedAt: null }, { claimedAt: mongoose.trusted({ $lte: staleThreshold }) }],
    },
    { $set: { claimedAt: now }, $inc: { attempts: 1 } },
    { sort: { reminderDate: 1 }, new: true },
  );
}

async function dispatchOne(reminder: ReminderDocument): Promise<'sent' | 'failed' | 'retrying'> {
  const obligation = await Obligation.findById(reminder.obligationId).select('title deadline status');

  if (!obligation) {
    await Reminder.updateOne(
      { _id: reminder._id },
      { $set: { status: 'cancelled', lastError: 'Obligation no longer exists', claimedAt: null } },
    );
    return 'failed';
  }

  if (obligation.status === 'rejected' || obligation.status === 'completed') {
    await Reminder.updateOne(
      { _id: reminder._id },
      {
        $set: {
          status: 'cancelled',
          lastError: `Obligation is ${obligation.status}`,
          claimedAt: null,
        },
      },
    );
    return 'failed';
  }

  try {
    await deliverNotification(reminder.channel as ReminderChannel, {
      ownerId: String(reminder.ownerId),
      reminderId: reminder.id as string,
      obligationId: String(reminder.obligationId),
      contractId: String(reminder.contractId),
      obligationTitle: obligation.title,
      deadline: obligation.deadline ?? null,
      message: reminder.message ?? null,
      reminderDate: reminder.reminderDate,
    });

    await Reminder.updateOne(
      { _id: reminder._id },
      { $set: { status: 'sent', sentAt: new Date(), lastError: null, claimedAt: null } },
    );
    return 'sent';
  } catch (error) {
    const errorCode = classifyDeliveryError(error);
    const exhausted = reminder.attempts >= env.REMINDER_MAX_ATTEMPTS;

    await Reminder.updateOne(
      { _id: reminder._id },
      {
        $set: {
          // Errors are recorded explicitly; nothing is swallowed silently.
          status: exhausted ? 'failed' : 'scheduled',
          // Persist a safe, stable code rather than arbitrary exception text.
          lastError: errorCode,
          // Keep the claim timestamp for retryable failures. The normal stale
          // claim threshold makes it eligible on a later scheduler pass rather
          // than immediately consuming every retry in this dispatch batch.
          claimedAt: exhausted ? null : reminder.claimedAt ?? new Date(),
        },
      },
    );

    logger.error('reminder.delivery_failed', {
      reminderId: reminder.id,
      channel: reminder.channel,
      attemptNumber: reminder.attempts,
      errorCode,
      retryState: exhausted ? 'exhausted' : 'retry_scheduled',
      occurredAt: new Date().toISOString(),
      exhausted,
    });

    return exhausted ? 'failed' : 'retrying';
  }
}

/** Processes up to REMINDER_BATCH_SIZE due reminders. Safe to call concurrently. */
export async function dispatchDueReminders(now: Date = new Date()): Promise<DispatchSummary> {
  const summary: DispatchSummary = { claimed: 0, sent: 0, failed: 0, retrying: 0 };

  for (let processed = 0; processed < env.REMINDER_BATCH_SIZE; processed += 1) {
    const reminder = await claimNextDueReminder(now);
    if (!reminder) break;

    summary.claimed += 1;
    const outcome = await dispatchOne(reminder);
    summary[outcome] += 1;
  }

  if (summary.claimed > 0) {
    logger.info('reminder.batch_processed', { ...summary });
  }

  return summary;
}
