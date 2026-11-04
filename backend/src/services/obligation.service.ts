import mongoose, { Types, type FilterQuery } from 'mongoose';
import { Obligation, type IObligation, type ObligationDocument } from '../models/Obligation';
import { Reminder } from '../models/Reminder';
import { Contract } from '../models/Contract';
import { OBLIGATION_STATUS_TRANSITIONS } from '../config/constants';
import { ApiError } from '../utils/ApiError';
import { buildPagination } from '../utils/apiResponse';
import { toObjectId } from '../utils/objectId';
import { logger } from '../utils/logger';
import type { ObligationStatus, PaginatedResult } from '../types';
import type {
  ListObligationsQuery,
  UpdateObligationInput,
} from '../validators/obligation.validator';

export function canTransition(from: ObligationStatus, to: ObligationStatus): boolean {
  if (from === to) return true;
  return OBLIGATION_STATUS_TRANSITIONS[from].includes(to);
}

function assertTransition(from: ObligationStatus, to: ObligationStatus): void {
  if (!canTransition(from, to)) {
    throw ApiError.badRequest(
      `An obligation cannot move from "${from}" to "${to}"`,
      'INVALID_STATUS_TRANSITION',
    );
  }
}

export async function listObligations(
  ownerId: string,
  query: ListObligationsQuery,
): Promise<PaginatedResult<ObligationDocument>> {
  const filter: FilterQuery<IObligation> = { ownerId: toObjectId(ownerId, 'user') };

  if (query.status) filter.status = query.status;
  if (query.contractId) filter.contractId = toObjectId(query.contractId, 'contract');
  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = { $regex: escaped, $options: 'i' };
  }
  if (query.dueBefore || query.dueAfter) {
    // database.ts sets `sanitizeFilter: true` globally.  Any plain object whose
    // keys start with "$" is rewritten to `{ $eq: <original> }` by Mongoose's
    // _castConditions(), making range operators non-functional and causing a
    // CastError on Date fields.  These dates come from Zod-validated query
    // params (not raw user input), so it is safe to mark them trusted.
    filter.deadline = mongoose.trusted({
      ...(query.dueAfter ? { $gte: query.dueAfter } : {}),
      ...(query.dueBefore ? { $lte: query.dueBefore } : {}),
    });
  }

  const sort: Record<string, 1 | -1> = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Obligation.find(filter).sort(sort).skip(skip).limit(query.limit),
    Obligation.countDocuments(filter),
  ]);

  return { items, pagination: buildPagination(query.page, query.limit, total) };
}

export async function getObligationForOwner(
  ownerId: string,
  obligationId: string,
): Promise<ObligationDocument> {
  const obligation = await Obligation.findOne({
    _id: toObjectId(obligationId, 'obligation'),
    ownerId: toObjectId(ownerId, 'user'),
  });

  if (!obligation) throw ApiError.notFound('Obligation not found', 'OBLIGATION_NOT_FOUND');
  return obligation;
}

/**
 * Applies a human review decision and/or a content edit.
 *
 * AI provenance (sourceClause, confidence, aiExplanation) is deliberately
 * immutable through this endpoint so the original suggestion stays auditable.
 */
export async function updateObligation(
  ownerId: string,
  obligationId: string,
  input: UpdateObligationInput,
): Promise<ObligationDocument> {
  const obligation = await getObligationForOwner(ownerId, obligationId);
  const { status, ...contentFields } = input;

  const hasContentEdit = Object.keys(contentFields).length > 0;

  if (hasContentEdit) {
    if (obligation.status === 'rejected') {
      throw ApiError.badRequest(
        'A rejected obligation must be restored before it can be edited',
        'OBLIGATION_REJECTED',
      );
    }
    if (input.title !== undefined) obligation.title = input.title;
    if (input.description !== undefined) obligation.description = input.description;
    if (input.deadline !== undefined) obligation.deadline = input.deadline;
    if (input.noticePeriod !== undefined) obligation.noticePeriod = input.noticePeriod;
    if (input.conditions !== undefined) obligation.conditions = input.conditions;
    obligation.editedByUser = true;
  }

  if (status && status !== obligation.status) {
    assertTransition(obligation.status, status as ObligationStatus);

    if (status === 'overdue') {
      throw ApiError.badRequest(
        '"overdue" is derived from the deadline and cannot be set directly',
        'STATUS_NOT_USER_ASSIGNABLE',
      );
    }

    obligation.status = status as ObligationStatus;

    if (status === 'confirmed' || status === 'rejected') obligation.reviewedAt = new Date();
    if (status === 'completed') obligation.completedAt = new Date();
    else obligation.completedAt = null;

    if (status === 'rejected') {
      // Pending reminders for a rejected obligation are cancelled, not deleted.
      await Reminder.updateMany(
        { obligationId: obligation._id, ownerId: obligation.ownerId, status: 'scheduled' },
        { $set: { status: 'cancelled' } },
      );
    }
  }

  await obligation.save();

  logger.info('obligation.updated', {
    obligationId: obligation.id,
    ownerId,
    status: obligation.status,
    edited: hasContentEdit,
  });

  return obligation;
}

/** Removes an obligation and its reminders, keeping the contract counter accurate. */
export async function deleteObligation(ownerId: string, obligationId: string): Promise<void> {
  const obligation = await getObligationForOwner(ownerId, obligationId);

  await Reminder.deleteMany({ obligationId: obligation._id, ownerId: obligation.ownerId });
  await Obligation.deleteOne({ _id: obligation._id, ownerId: obligation.ownerId });
  await Contract.updateOne(
    { _id: obligation.contractId, obligationCount: { $gt: 0 } },
    { $inc: { obligationCount: -1 } },
  );

  logger.info('obligation.deleted', { obligationId, ownerId });
}

/** Returns per-status counts for the authenticated user's obligations. */
export async function getObligationStats(ownerId: string): Promise<Record<string, number>> {
  const rows = await Obligation.aggregate<{ _id: string; count: number }>([
    { $match: { ownerId: new Types.ObjectId(ownerId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});
}

/**
 * Moves confirmed obligations whose deadline has passed into `overdue`.
 * Invoked by the scheduler; safe to run repeatedly.
 *
 * Root-cause fix for:
 *   CastError: Cast to date failed for value
 *     "{ '$ne': null, '$lt': <Date> }" (type Object) at path "deadline"
 *
 * database.ts sets `mongoose.set('sanitizeFilter', true)` globally to block
 * NoSQL injection from user-supplied HTTP bodies.  That setting runs inside
 * Mongoose's _castConditions() for EVERY query and rewrites any plain-object
 * filter value whose keys start with "$" into `{ $eq: <original_value> }`:
 *
 *   deadline: { $ne: null, $lt: reference }
 *     → deadline: { $eq: { $ne: null, $lt: reference } }
 *
 * Mongoose then tries to cast `{ $ne: null, $lt: reference }` (a plain Object)
 * as a Date for the `deadline` field and throws.  Passing `sanitizeFilter:
 * false` on query options is ineffective: Mongoose honours the global base
 * option first.
 *
 * The correct escape-hatch is `mongoose.trusted()`, which attaches the
 * internal `trustedSymbol` to the value; sanitizeFilter explicitly skips
 * values carrying that symbol.  This query is scheduler-internal with no
 * user-controlled input, so it is safe to bypass sanitization here.
 */
export async function markOverdueObligations(reference: Date = new Date()): Promise<number> {
  const result = await Obligation.updateMany(
    {
      status: 'confirmed',
      deadline: mongoose.trusted({ $ne: null, $lt: reference }),
    },
    { $set: { status: 'overdue' } },
  );
  return result.modifiedCount ?? 0;
}
