import type { FilterQuery } from 'mongoose';
import { Reminder, type IReminder, type ReminderDocument } from '../models/Reminder';
import { ApiError } from '../utils/ApiError';
import { buildPagination } from '../utils/apiResponse';
import { toObjectId } from '../utils/objectId';
import { logger } from '../utils/logger';
import { isPast } from '../utils/date';
import type { PaginatedResult, ReminderChannel } from '../types';
import type {
  CreateReminderInput,
  ListRemindersQuery,
  UpdateReminderInput,
} from '../validators/reminder.validator';
import { getObligationForOwner } from './obligation.service';
import { isChannelAvailable } from './notification.service';

function assertFutureDate(date: Date): void {
  if (isPast(date)) {
    throw ApiError.badRequest('Reminder date must be in the future', 'REMINDER_DATE_IN_PAST');
  }
}

function assertChannelAvailable(channel: ReminderChannel): void {
  if (!isChannelAvailable(channel)) {
    throw ApiError.badRequest(
      `Notification channel "${channel}" is not configured on this server`,
      'CHANNEL_NOT_CONFIGURED',
    );
  }
}

export async function createReminder(
  ownerId: string,
  input: CreateReminderInput,
): Promise<ReminderDocument> {
  // Ownership of the obligation is verified before anything is created.
  const obligation = await getObligationForOwner(ownerId, input.obligationId);

  if (obligation.status === 'rejected') {
    throw ApiError.badRequest(
      'Reminders cannot be created for a rejected obligation',
      'OBLIGATION_REJECTED',
    );
  }

  assertFutureDate(input.reminderDate);
  assertChannelAvailable(input.channel as ReminderChannel);

  try {
    const reminder = await Reminder.create({
      obligationId: obligation._id,
      contractId: obligation.contractId,
      ownerId: obligation.ownerId,
      reminderDate: input.reminderDate,
      channel: input.channel,
      message: input.message ?? null,
      status: 'scheduled',
    });

    logger.info('reminder.created', { reminderId: reminder.id, ownerId });
    return reminder;
  } catch (error) {
    if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
      throw ApiError.conflict(
        'A reminder for this obligation already exists at that time',
        'DUPLICATE_REMINDER',
      );
    }
    throw error;
  }
}

export async function listReminders(
  ownerId: string,
  query: ListRemindersQuery,
): Promise<PaginatedResult<ReminderDocument>> {
  const filter: FilterQuery<IReminder> = { ownerId: toObjectId(ownerId, 'user') };
  if (query.status) filter.status = query.status;
  if (query.obligationId) filter.obligationId = toObjectId(query.obligationId, 'obligation');

  const sort: Record<string, 1 | -1> = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Reminder.find(filter).sort(sort).skip(skip).limit(query.limit),
    Reminder.countDocuments(filter),
  ]);

  return { items, pagination: buildPagination(query.page, query.limit, total) };
}

export async function getReminderForOwner(
  ownerId: string,
  reminderId: string,
): Promise<ReminderDocument> {
  const reminder = await Reminder.findOne({
    _id: toObjectId(reminderId, 'reminder'),
    ownerId: toObjectId(ownerId, 'user'),
  });

  if (!reminder) throw ApiError.notFound('Reminder not found', 'REMINDER_NOT_FOUND');
  return reminder;
}

export async function updateReminder(
  ownerId: string,
  reminderId: string,
  input: UpdateReminderInput,
): Promise<ReminderDocument> {
  const reminder = await getReminderForOwner(ownerId, reminderId);

  if (reminder.status === 'sent') {
    throw ApiError.badRequest('A delivered reminder cannot be modified', 'REMINDER_ALREADY_SENT');
  }

  if (input.reminderDate !== undefined) {
    assertFutureDate(input.reminderDate);
    reminder.reminderDate = input.reminderDate;
  }
  if (input.message !== undefined) reminder.message = input.message;
  if (input.channel !== undefined) {
    assertChannelAvailable(input.channel as ReminderChannel);
    reminder.channel = input.channel as ReminderChannel;
  }
  if (input.status !== undefined) {
    if (input.status === 'scheduled' && reminder.status !== 'scheduled') {
      // Re-arming resets the delivery bookkeeping.
      reminder.attempts = 0;
      reminder.lastError = null;
      reminder.claimedAt = null;
      assertFutureDate(reminder.reminderDate);
    }
    reminder.status = input.status;
  }

  await reminder.save();
  logger.info('reminder.updated', { reminderId: reminder.id, ownerId, status: reminder.status });

  return reminder;
}

/** Cancels a scheduled reminder; already-delivered reminders are deleted outright. */
export async function cancelReminder(ownerId: string, reminderId: string): Promise<ReminderDocument | null> {
  const reminder = await getReminderForOwner(ownerId, reminderId);

  if (reminder.status === 'scheduled') {
    reminder.status = 'cancelled';
    await reminder.save();
    logger.info('reminder.cancelled', { reminderId: reminder.id, ownerId });
    return reminder;
  }

  await Reminder.deleteOne({ _id: reminder._id, ownerId: reminder.ownerId });
  logger.info('reminder.deleted', { reminderId, ownerId });
  return null;
}
