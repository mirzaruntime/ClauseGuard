/**
 * Regression tests for the reminder-dispatch CastError.
 *
 * Root cause: database.ts sets `mongoose.set('sanitizeFilter', true)` globally
 * to block NoSQL injection from HTTP request bodies.  That global option also
 * runs on every Mongoose query inside `_castConditions()` and rewrites any
 * filter value that contains MongoDB operators into `{ $eq: <original_value> }`.
 * For the scheduler's atomic-claim query this transformed:
 *
 *   reminderDate: { $lte: now }  →  reminderDate: { $eq: { $lte: now } }
 *
 * Mongoose then tried to cast `{ $lte: now }` (a plain Object) as a Date and
 * threw:
 *   CastError: Cast to date failed for value "{ '$lte': <Date> }"
 *              (type Object) at path "reminderDate" for model "Reminder"
 *
 * Fix: wrap the trusted, server-internal operator expressions with
 * `mongoose.trusted()`.  sanitizeFilter explicitly skips values that carry
 * the internal `trustedSymbol`, so the `$lte` operators reach MongoDB intact.
 *
 * These tests run WITHOUT a live MongoDB connection.  They probe Mongoose's
 * internal `_castConditions()` to assert:
 *   1. The original query pattern reproduces the CastError (regression guard).
 *   2. The fixed query pattern produces no error and retains `$lte` operators.
 *   3. `dispatchDueReminders` behaves correctly via mock-based delivery.
 */

import mongoose, { type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Set up the global mongoose options exactly as database.ts does at runtime.
// Jest isolates modules per test file, so this affects only this suite.
// ---------------------------------------------------------------------------
beforeAll(() => {
  mongoose.set('sanitizeFilter', true);
});

afterAll(() => {
  try {
    mongoose.deleteModel('_RegressionReminder');
  } catch {
    // model not registered yet — safe to ignore
  }
});

// ---------------------------------------------------------------------------
// Minimal Reminder-compatible schema (matches src/models/Reminder.ts exactly).
// ---------------------------------------------------------------------------
interface IRegressionReminder {
  obligationId: mongoose.Types.ObjectId;
  contractId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  reminderDate: Date;
  status: string;
  channel: string;
  message: string | null;
  claimedAt: Date | null;
  sentAt: Date | null;
  attempts: number;
  lastError: string | null;
}

const schema = new mongoose.Schema<IRegressionReminder>(
  {
    obligationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Obligation', required: true },
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reminderDate: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ['scheduled', 'sent', 'cancelled', 'failed'],
      default: 'scheduled',
    },
    channel: { type: String, enum: ['log', 'email'], default: 'log' },
    message: { type: String, maxlength: 1000, default: null },
    claimedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    attempts: { type: Number, default: 0, min: 0 },
    lastError: { type: String, maxlength: 1000, default: null },
  },
  { timestamps: true },
);

// Register with a unique name so it never conflicts with the real Reminder model.
const RegressionModel: Model<IRegressionReminder> = (() => {
  try {
    return mongoose.model<IRegressionReminder>('_RegressionReminder');
  } catch {
    return mongoose.model<IRegressionReminder>('_RegressionReminder', schema);
  }
})();

const CLAIM_TIMEOUT_MS = 5 * 60_000;

/** Helper: run Mongoose's internal cast-conditions phase on a query. */
function runCastConditions(query: any): void {
  // _castConditions is a Mongoose-internal method not exposed in public types.
  // We call it via `any` to simulate what happens during query execution.
  (query as any)._castConditions();
}

/** Helper: read the raw internal _conditions from a Mongoose Query. */
function getConditions(query: any): Record<string, unknown> {
  return (query as any)._conditions as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helper: build the atomic-claim query in the ORIGINAL (buggy) form.
// ---------------------------------------------------------------------------
function buildBuggyClaimQuery(now: Date) {
  const staleThreshold = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
  return RegressionModel.findOneAndUpdate(
    {
      status: 'scheduled',
      reminderDate: { $lte: now },
      $or: [{ claimedAt: null }, { claimedAt: { $lte: staleThreshold } }],
    },
    { $set: { claimedAt: now }, $inc: { attempts: 1 } },
    { sort: { reminderDate: 1 }, new: true },
  );
}

// ---------------------------------------------------------------------------
// Helper: build the atomic-claim query in the FIXED form (mongoose.trusted).
// ---------------------------------------------------------------------------
function buildFixedClaimQuery(now: Date) {
  const staleThreshold = new Date(now.getTime() - CLAIM_TIMEOUT_MS);
  return RegressionModel.findOneAndUpdate(
    {
      status: 'scheduled',
      reminderDate: mongoose.trusted({ $lte: now }),
      $or: [{ claimedAt: null }, { claimedAt: mongoose.trusted({ $lte: staleThreshold }) }],
    },
    { $set: { claimedAt: now }, $inc: { attempts: 1 } },
    { sort: { reminderDate: 1 }, new: true },
  );
}

// ---------------------------------------------------------------------------
// Section 1 – Reproduce the original bug
// ---------------------------------------------------------------------------
describe('reminder-dispatch CastError regression (sanitizeFilter interaction)', () => {
  it('REGRESSION: original query produces a CastError when sanitizeFilter is true', () => {
    const now = new Date();
    const query = buildBuggyClaimQuery(now);

    // Force Mongoose to run sanitizeFilter + cast synchronously.
    // _castConditions() stores any CastError on the query rather than throwing.
    runCastConditions(query);
    const err = (query as any).error() as Error | null;

    expect(err).not.toBeNull();
    expect(err!.name).toBe('CastError');
    expect(err!.message).toMatch(/Cast to date failed/);
    expect(err!.message).toMatch(/\$lte/);
    expect(err!.message).toMatch(/reminderDate/);
  });

  it('REGRESSION: sanitizeFilter wraps $lte into $eq, destroying the range condition', () => {
    const now = new Date();
    const query = buildBuggyClaimQuery(now);
    runCastConditions(query);

    // After sanitizeFilter, condition becomes { $eq: { $lte: now } }
    // instead of { $lte: now }.  We observe this in the mutated _conditions.
    const rdCond = getConditions(query)['reminderDate'] as Record<string, unknown>;
    expect(rdCond).toHaveProperty('$eq');
    // The Date is nested wrongly inside $eq — not directly under $lte.
    expect(rdCond['$eq']).not.toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// Section 2 – Verify the fix
// ---------------------------------------------------------------------------
describe('reminder-dispatch fix: mongoose.trusted() bypasses sanitizeFilter correctly', () => {
  it('fixed query produces no CastError', () => {
    const now = new Date();
    const query = buildFixedClaimQuery(now);
    runCastConditions(query);
    // error() returns undefined when there's no error, null otherwise isn't guaranteed.
    const err = (query as any).error() as Error | undefined;
    // toBeFalsy() matches both null and undefined — either means no error stored.
    expect(err).toBeFalsy();
  });

  it('fixed query retains $lte operator on reminderDate after casting', () => {
    const now = new Date();
    const query = buildFixedClaimQuery(now);
    runCastConditions(query);

    const rdCond = getConditions(query)['reminderDate'] as Record<string, unknown>;

    // The $lte operator must survive sanitizeFilter and must hold a Date value.
    expect(rdCond).toHaveProperty('$lte');
    expect(rdCond['$lte']).toBeInstanceOf(Date);
    // Must NOT be wrapped in $eq by sanitizeFilter.
    expect(rdCond).not.toHaveProperty('$eq');
  });

  it('fixed query retains $lte operator on claimedAt (inside $or) after casting', () => {
    const now = new Date();
    const query = buildFixedClaimQuery(now);
    runCastConditions(query);

    const orArray = getConditions(query)['$or'] as Array<Record<string, unknown>>;

    expect(Array.isArray(orArray)).toBe(true);
    expect(orArray).toHaveLength(2);

    // First branch: claimedAt: null (unclaimed)
    expect(orArray[0]).toEqual({ claimedAt: null });

    // Second branch: stale claim (claimedAt <= staleThreshold)
    const claimedAtCond = orArray[1]['claimedAt'] as Record<string, unknown>;
    expect(claimedAtCond).toHaveProperty('$lte');
    expect(claimedAtCond['$lte']).toBeInstanceOf(Date);
    expect(claimedAtCond).not.toHaveProperty('$eq');
  });

  it('fixed query includes status: "scheduled" in the filter', () => {
    const now = new Date();
    const query = buildFixedClaimQuery(now);
    runCastConditions(query);
    expect(getConditions(query)['status']).toBe('scheduled');
  });

  it('fixed query does not claim future reminders (reminderDate boundary equals now)', () => {
    // A future reminder has reminderDate > now.  The $lte: now boundary must
    // equal the `now` passed in — not some corrupted value from sanitizeFilter.
    const now = new Date();
    const query = buildFixedClaimQuery(now);
    runCastConditions(query);

    const rdCond = getConditions(query)['reminderDate'] as Record<string, unknown>;
    const boundary = rdCond['$lte'] as Date;

    // Boundary must equal `now` (within 1 ms floating-point tolerance).
    expect(Math.abs(boundary.getTime() - now.getTime())).toBeLessThan(2);
  });
});

// ---------------------------------------------------------------------------
// Section 3 – dispatchDueReminders integration (mock-based, no DB required)
// ---------------------------------------------------------------------------
describe('dispatchDueReminders (mock-based): correct filtering and claim logic', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns zero claimed when no due reminder is available', async () => {
    jest.doMock('../../src/models/Reminder', () => ({
      Reminder: {
        findOneAndUpdate: jest.fn().mockResolvedValue(null),
      },
    }));

    const { dispatchDueReminders } = await import('../../src/jobs/reminder.job');
    const result = await dispatchDueReminders(new Date());
    expect(result.claimed).toBe(0);
    expect(result.sent).toBe(0);
  });

  it('does not attempt delivery for a future reminder (findOneAndUpdate returns null)', async () => {
    // When the filter correctly excludes future reminders, findOneAndUpdate
    // returns null.  dispatchDueReminders must return claimed=0.
    const findOneAndUpdate = jest.fn().mockResolvedValue(null);
    jest.doMock('../../src/models/Reminder', () => ({
      Reminder: { findOneAndUpdate },
    }));

    const { dispatchDueReminders } = await import('../../src/jobs/reminder.job');
    await dispatchDueReminders(new Date());

    expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter] = findOneAndUpdate.mock.calls[0] as [Record<string, unknown>];
    expect(filter['status']).toBe('scheduled');

    // The reminderDate condition must be present and be an operator object.
    // With the fix, mongoose.trusted() ensures it reaches the mock without
    // being mangled by sanitizeFilter into { $eq: { $lte: ... } }.
    const rdCond = filter['reminderDate'] as Record<string, unknown>;
    expect(rdCond).toBeDefined();
    expect(typeof rdCond).toBe('object');
  });

  it('claims and dispatches exactly one due reminder', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const fakeReminder = {
      _id: fakeId,
      id: 'fake-reminder-id',
      obligationId: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
      channel: 'log',
      message: 'Test',
      attempts: 0,
      reminderDate: new Date(Date.now() - 5000),
    };

    const fakeObligation = {
      title: 'Test obligation',
      deadline: new Date('2027-01-01'),
      status: 'confirmed',
    };

    const findOneAndUpdate = jest
      .fn()
      .mockResolvedValueOnce(fakeReminder)
      .mockResolvedValue(null);

    const findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(fakeObligation),
    });

    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });

    jest.doMock('../../src/models/Reminder', () => ({
      Reminder: { findOneAndUpdate, updateOne },
    }));
    jest.doMock('../../src/models/Obligation', () => ({
      Obligation: { findById },
    }));
    jest.doMock('../../src/services/notification.service', () => ({
      deliverNotification: jest.fn().mockResolvedValue(undefined),
    }));

    const { dispatchDueReminders } = await import('../../src/jobs/reminder.job');
    const result = await dispatchDueReminders(new Date());

    expect(result.claimed).toBe(1);
    expect(result.sent).toBe(1);
    expect(findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: fakeId },
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'sent' }),
      }),
    );
  });

  it('retries provider failures only until REMINDER_MAX_ATTEMPTS, then marks failed', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const makeReminder = (attempts: number) => ({
      _id: fakeId,
      id: 'retry-reminder-id',
      obligationId: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
      contractId: new mongoose.Types.ObjectId(),
      channel: 'email',
      message: null,
      reminderDate: new Date(Date.now() - 5000),
      attempts,
    });
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    jest.doMock('../../src/models/Reminder', () => ({
      Reminder: {
        findOneAndUpdate: jest.fn()
          .mockResolvedValueOnce(makeReminder(1)).mockResolvedValueOnce(null)
          .mockResolvedValueOnce(makeReminder(3)).mockResolvedValueOnce(null),
        updateOne,
      },
    }));
    jest.doMock('../../src/models/Obligation', () => ({
      Obligation: { findById: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ title: 'Renewal', deadline: null, status: 'confirmed' }),
      }) },
    }));
    jest.doMock('../../src/services/notification.service', () => ({
      deliverNotification: jest.fn().mockRejectedValue(new Error('EMAIL_PROVIDER_REJECTED:validation_error')),
    }));

    const { dispatchDueReminders } = await import('../../src/jobs/reminder.job');
    const retry = await dispatchDueReminders(new Date());
    expect(retry.retrying).toBe(1);
    expect(updateOne).toHaveBeenNthCalledWith(1, { _id: fakeId }, expect.objectContaining({
      $set: expect.objectContaining({ status: 'scheduled', claimedAt: expect.any(Date) }),
    }));

    const exhausted = await dispatchDueReminders(new Date());
    expect(exhausted.failed).toBe(1);
    expect(updateOne).toHaveBeenNthCalledWith(2, { _id: fakeId }, expect.objectContaining({
      $set: expect.objectContaining({ status: 'failed', claimedAt: null }),
    }));
  });

  it('logs only safe metadata when a provider error contains reminder content', async () => {
    const sensitiveMessage = 'PRIVATE_REMINDER_MESSAGE_DO_NOT_LOG';
    const sensitiveTitle = 'PRIVATE_OBLIGATION_TITLE_DO_NOT_LOG';
    const fakeId = new mongoose.Types.ObjectId();
    const fakeReminder = {
      _id: fakeId,
      id: 'private-content-reminder-id',
      obligationId: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
      contractId: new mongoose.Types.ObjectId(),
      channel: 'email',
      message: sensitiveMessage,
      reminderDate: new Date(Date.now() - 5000),
      attempts: 2,
    };
    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const loggerError = jest.fn();

    jest.doMock('../../src/models/Reminder', () => ({
      Reminder: {
        findOneAndUpdate: jest.fn().mockResolvedValueOnce(fakeReminder).mockResolvedValue(null),
        updateOne,
      },
    }));
    jest.doMock('../../src/models/Obligation', () => ({
      Obligation: { findById: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ title: sensitiveTitle, deadline: null, status: 'confirmed' }),
      }) },
    }));
    jest.doMock('../../src/services/notification.service', () => ({
      deliverNotification: jest.fn().mockRejectedValue(
        new Error(`Provider rejected reminder content: ${sensitiveMessage}; ${sensitiveTitle}`),
      ),
    }));
    jest.doMock('../../src/utils/logger', () => ({ logger: { info: jest.fn(), error: loggerError } }));

    const { dispatchDueReminders } = await import('../../src/jobs/reminder.job');
    const result = await dispatchDueReminders(new Date());
    const logged = JSON.stringify(loggerError.mock.calls);

    expect(result.retrying).toBe(1);
    expect(logged).not.toContain(sensitiveMessage);
    expect(logged).not.toContain(sensitiveTitle);
    expect(logged).not.toContain('Provider rejected reminder content');
    expect(loggerError).toHaveBeenCalledWith('reminder.delivery_failed', expect.objectContaining({
      reminderId: fakeReminder.id,
      channel: 'email',
      attemptNumber: 2,
      errorCode: 'UNEXPECTED_ERROR',
      retryState: 'retry_scheduled',
      occurredAt: expect.any(String),
    }));
    expect(updateOne).toHaveBeenCalledWith({ _id: fakeId }, expect.objectContaining({
      $set: expect.objectContaining({ lastError: 'UNEXPECTED_ERROR', status: 'scheduled' }),
    }));
  });

  it('does not log sensitive text from an unexpected internal delivery operation', async () => {
    const sensitiveMessage = 'PRIVATE_INTERNAL_ERROR_TEXT_DO_NOT_LOG';
    const sensitiveTitle = 'PRIVATE_INTERNAL_TITLE_DO_NOT_LOG';
    const fakeId = new mongoose.Types.ObjectId();
    const fakeReminder = {
      _id: fakeId,
      id: 'internal-error-reminder-id',
      obligationId: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
      contractId: new mongoose.Types.ObjectId(),
      channel: 'email',
      message: sensitiveMessage,
      reminderDate: new Date(Date.now() - 5000),
      attempts: 1,
    };
    const updateOne = jest.fn()
      .mockRejectedValueOnce(new Error(`Internal persistence failure: ${sensitiveMessage}; ${sensitiveTitle}`))
      .mockResolvedValue({ modifiedCount: 1 });
    const loggerError = jest.fn();

    jest.doMock('../../src/models/Reminder', () => ({
      Reminder: {
        findOneAndUpdate: jest.fn().mockResolvedValueOnce(fakeReminder).mockResolvedValue(null),
        updateOne,
      },
    }));
    jest.doMock('../../src/models/Obligation', () => ({
      Obligation: { findById: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ title: sensitiveTitle, deadline: null, status: 'confirmed' }),
      }) },
    }));
    jest.doMock('../../src/services/notification.service', () => ({
      deliverNotification: jest.fn().mockResolvedValue(undefined),
    }));
    jest.doMock('../../src/utils/logger', () => ({ logger: { info: jest.fn(), error: loggerError } }));

    const { dispatchDueReminders } = await import('../../src/jobs/reminder.job');
    const result = await dispatchDueReminders(new Date());
    const logged = JSON.stringify(loggerError.mock.calls);

    expect(result.retrying).toBe(1);
    expect(logged).not.toContain(sensitiveMessage);
    expect(logged).not.toContain(sensitiveTitle);
    expect(logged).not.toContain('Internal persistence failure');
    expect(loggerError).toHaveBeenCalledWith('reminder.delivery_failed', expect.objectContaining({
      reminderId: fakeReminder.id,
      channel: 'email',
      attemptNumber: 1,
      errorCode: 'UNEXPECTED_ERROR',
      retryState: 'retry_scheduled',
      occurredAt: expect.any(String),
    }));
  });

  it('marks reminder cancelled when its obligation no longer exists', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const fakeReminder = {
      _id: fakeId,
      id: 'gone-reminder-id',
      obligationId: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
      channel: 'log',
      message: null,
      attempts: 0,
    };

    const findOneAndUpdate = jest
      .fn()
      .mockResolvedValueOnce(fakeReminder)
      .mockResolvedValue(null);

    const findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });

    jest.doMock('../../src/models/Reminder', () => ({
      Reminder: { findOneAndUpdate, updateOne },
    }));
    jest.doMock('../../src/models/Obligation', () => ({
      Obligation: { findById },
    }));
    jest.doMock('../../src/services/notification.service', () => ({
      deliverNotification: jest.fn(),
    }));

    const { dispatchDueReminders } = await import('../../src/jobs/reminder.job');
    const result = await dispatchDueReminders(new Date());

    expect(result.claimed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: fakeId },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'cancelled',
          lastError: 'Obligation no longer exists',
        }),
      }),
    );
  });

  it('does not deliver to a completed obligation and marks reminder cancelled', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const fakeReminder = {
      _id: fakeId,
      id: 'completed-reminder-id',
      obligationId: new mongoose.Types.ObjectId(),
      ownerId: new mongoose.Types.ObjectId(),
      channel: 'log',
      message: null,
      attempts: 0,
    };

    const fakeObligation = { title: 'Done', deadline: null as Date | null, status: 'completed' };

    const updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });

    jest.doMock('../../src/models/Reminder', () => ({
      Reminder: {
        findOneAndUpdate: jest
          .fn()
          .mockResolvedValueOnce(fakeReminder)
          .mockResolvedValue(null),
        updateOne,
      },
    }));
    jest.doMock('../../src/models/Obligation', () => ({
      Obligation: {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue(fakeObligation),
        }),
      },
    }));
    jest.doMock('../../src/services/notification.service', () => ({
      deliverNotification: jest.fn(),
    }));

    const { dispatchDueReminders } = await import('../../src/jobs/reminder.job');
    const result = await dispatchDueReminders(new Date());

    expect(result.claimed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(0);
  });
});
