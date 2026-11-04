/**
 * Regression tests for the overdue-sweep CastError.
 *
 * Root cause: database.ts sets `mongoose.set('sanitizeFilter', true)` globally
 * to block NoSQL injection from HTTP request bodies.  That global option also
 * runs on every Mongoose query inside `_castConditions()` and rewrites any
 * filter value that contains MongoDB operators into `{ $eq: <original_value> }`.
 * For the scheduler's overdue sweep this transformed:
 *
 *   deadline: { $ne: null, $lt: reference }
 *     → deadline: { $eq: { $ne: null, $lt: reference } }
 *
 * Mongoose then tried to cast `{ $ne: null, $lt: reference }` (a plain Object)
 * as a Date for the `deadline` field and threw:
 *   CastError: Cast to date failed for value
 *     "{ '$ne': null, '$lt': 2026-10-02T11:00:00.003Z }" (type Object)
 *     at path "deadline" for model "Obligation"
 *
 * Fix: wrap the trusted, server-internal operator expression with
 * `mongoose.trusted()`.  sanitizeFilter explicitly skips values that carry
 * the internal `trustedSymbol`, so the `$ne`/`$lt` operators reach MongoDB
 * intact.
 *
 * These tests run WITHOUT a live MongoDB connection.  They probe Mongoose's
 * internal `_castConditions()` to assert:
 *   1. The original query pattern reproduces the CastError (regression guard).
 *   2. The fixed query pattern produces no error and retains both operators.
 *   3. `markOverdueObligations` uses the correct filter structure.
 *   4. Business rules: null/missing deadlines, future deadlines, and
 *      ineligible statuses are never promoted to overdue.
 */

import mongoose, { type Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Mirror the global option exactly as database.ts sets it at runtime.
// Jest isolates module-level state per test file, so this only affects this
// suite.
// ---------------------------------------------------------------------------
beforeAll(() => {
  mongoose.set('sanitizeFilter', true);
});

afterAll(() => {
  try {
    mongoose.deleteModel('_RegressionObligation');
  } catch {
    // model not registered yet — safe to ignore
  }
});

// ---------------------------------------------------------------------------
// Minimal Obligation-compatible schema (mirrors src/models/Obligation.ts).
// ---------------------------------------------------------------------------
interface IRegressionObligation {
  status: string;
  deadline: Date | null;
}

const schema = new mongoose.Schema<IRegressionObligation>({
  status: {
    type: String,
    required: true,
    enum: ['potential', 'confirmed', 'rejected', 'completed', 'overdue'],
    default: 'potential',
  },
  deadline: { type: Date, default: null },
});

// Register with a unique name so it never conflicts with the real model.
const RegressionModel: Model<IRegressionObligation> = (() => {
  try {
    return mongoose.model<IRegressionObligation>('_RegressionObligation');
  } catch {
    return mongoose.model<IRegressionObligation>('_RegressionObligation', schema);
  }
})();

/** Helper: run Mongoose's internal cast-conditions phase on a query. */
function runCastConditions(query: unknown): void {
  // _castConditions is a Mongoose-internal method; we call it via `any`
  // to simulate what happens during query execution.
  (query as Record<string, () => void>)._castConditions();
}

/** Helper: read the raw internal _conditions from a Mongoose Query. */
function getConditions(query: unknown): Record<string, unknown> {
  return (query as Record<string, unknown>)._conditions as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helper: build the overdue-sweep updateMany in the ORIGINAL (buggy) form.
// ---------------------------------------------------------------------------
function buildBuggyOverdueQuery(reference: Date) {
  return RegressionModel.updateMany(
    { status: 'confirmed', deadline: { $ne: null, $lt: reference } },
    { $set: { status: 'overdue' } },
  );
}

// ---------------------------------------------------------------------------
// Helper: build the overdue-sweep updateMany in the FIXED form.
// ---------------------------------------------------------------------------
function buildFixedOverdueQuery(reference: Date) {
  return RegressionModel.updateMany(
    {
      status: 'confirmed',
      deadline: mongoose.trusted({ $ne: null, $lt: reference }),
    },
    { $set: { status: 'overdue' } },
  );
}

// ---------------------------------------------------------------------------
// Section 1 – Reproduce the original bug
// ---------------------------------------------------------------------------
describe('overdue-sweep CastError regression (sanitizeFilter interaction)', () => {
  it('REGRESSION: original query produces a CastError when sanitizeFilter is true', () => {
    const reference = new Date();
    const query = buildBuggyOverdueQuery(reference);

    // Force Mongoose to run sanitizeFilter + cast synchronously.
    // _castConditions() stores any CastError on the query rather than throwing.
    runCastConditions(query);
    const err = (query as unknown as { error(): Error | null }).error();

    expect(err).not.toBeNull();
    expect(err!.name).toBe('CastError');
    expect(err!.message).toMatch(/Cast to date failed/);
    // Both operators must appear in the error message (the whole object is printed).
    expect(err!.message).toMatch(/\$ne/);
    expect(err!.message).toMatch(/\$lt/);
    expect(err!.message).toMatch(/deadline/);
  });

  it('REGRESSION: sanitizeFilter wraps $ne+$lt into $eq, destroying range conditions', () => {
    const reference = new Date();
    const query = buildBuggyOverdueQuery(reference);
    runCastConditions(query);

    // After sanitizeFilter the deadline condition becomes
    //   { $eq: { $ne: null, $lt: reference } }
    // instead of the correct { $ne: null, $lt: reference }.
    const deadlineCond = getConditions(query)['deadline'] as Record<string, unknown>;
    expect(deadlineCond).toHaveProperty('$eq');
    // The nested object must NOT be a Date — that is the wrong structure.
    expect(deadlineCond['$eq']).not.toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// Section 2 – Verify the fix
// ---------------------------------------------------------------------------
describe('overdue-sweep fix: mongoose.trusted() bypasses sanitizeFilter correctly', () => {
  it('fixed query produces no CastError', () => {
    const reference = new Date();
    const query = buildFixedOverdueQuery(reference);
    runCastConditions(query);
    const err = (query as unknown as { error(): Error | null | undefined }).error();
    // toBeFalsy() matches both null and undefined — either means no error.
    expect(err).toBeFalsy();
  });

  it('fixed query retains $lt operator on deadline after casting', () => {
    const reference = new Date();
    const query = buildFixedOverdueQuery(reference);
    runCastConditions(query);

    const deadlineCond = getConditions(query)['deadline'] as Record<string, unknown>;

    // The $lt operator must survive sanitizeFilter and hold a Date value.
    expect(deadlineCond).toHaveProperty('$lt');
    expect(deadlineCond['$lt']).toBeInstanceOf(Date);
    // Must NOT be wrapped in $eq.
    expect(deadlineCond).not.toHaveProperty('$eq');
  });

  it('fixed query retains $ne: null operator on deadline after casting', () => {
    const reference = new Date();
    const query = buildFixedOverdueQuery(reference);
    runCastConditions(query);

    const deadlineCond = getConditions(query)['deadline'] as Record<string, unknown>;
    // $ne: null must be preserved to prevent null-deadline obligations from
    // being matched.
    expect(deadlineCond).toHaveProperty('$ne');
    expect(deadlineCond['$ne']).toBeNull();
  });

  it('fixed query boundary equals the reference date passed in', () => {
    const reference = new Date();
    const query = buildFixedOverdueQuery(reference);
    runCastConditions(query);

    const deadlineCond = getConditions(query)['deadline'] as Record<string, unknown>;
    const boundary = deadlineCond['$lt'] as Date;

    // Boundary must equal `reference` exactly (within 1 ms tolerance).
    expect(Math.abs(boundary.getTime() - reference.getTime())).toBeLessThan(2);
  });

  it('fixed query targets only status: "confirmed" obligations', () => {
    const reference = new Date();
    const query = buildFixedOverdueQuery(reference);
    runCastConditions(query);
    expect(getConditions(query)['status']).toBe('confirmed');
  });
});

// ---------------------------------------------------------------------------
// Section 3 – Business rules verified at the filter-structure level
//
// Without a live database we cannot run real updateMany operations, so we
// verify that the filter structure encodes the correct business invariants.
// ---------------------------------------------------------------------------
describe('overdue-sweep business rules (filter-structure assertions)', () => {
  it('null deadline: $ne: null guard prevents matching obligations without a deadline', () => {
    // A null deadline must be excluded.  The $ne: null operator in the fixed
    // filter is the only mechanism for this.  We verify it is present.
    const reference = new Date();
    const query = buildFixedOverdueQuery(reference);
    runCastConditions(query);

    const deadlineCond = getConditions(query)['deadline'] as Record<string, unknown>;
    expect(deadlineCond['$ne']).toBeNull();
  });

  it('future deadline: $lt boundary ensures future deadlines are not matched', () => {
    // A future deadline (deadline > reference) must NOT be selected.
    // The $lt: reference boundary enforces this.
    const reference = new Date('2026-10-02T11:00:00.000Z');
    const query = buildFixedOverdueQuery(reference);
    runCastConditions(query);

    const deadlineCond = getConditions(query)['deadline'] as Record<string, unknown>;
    const boundary = deadlineCond['$lt'] as Date;

    expect(boundary.toISOString()).toBe('2026-10-02T11:00:00.000Z');
    // A future date (2027) would NOT satisfy deadline < boundary.
    const futureDeadline = new Date('2027-01-01T00:00:00.000Z');
    expect(futureDeadline < boundary).toBe(false);
  });

  it('past deadline: $lt boundary correctly includes past deadlines', () => {
    const reference = new Date('2026-10-02T11:00:00.000Z');
    const query = buildFixedOverdueQuery(reference);
    runCastConditions(query);

    const deadlineCond = getConditions(query)['deadline'] as Record<string, unknown>;
    const boundary = deadlineCond['$lt'] as Date;

    // A past deadline does satisfy deadline < boundary.
    const pastDeadline = new Date('2026-09-01T00:00:00.000Z');
    expect(pastDeadline < boundary).toBe(true);
  });

  it('ineligible status: only "confirmed" is in the filter — other statuses are excluded', () => {
    const reference = new Date();
    const query = buildFixedOverdueQuery(reference);
    runCastConditions(query);

    expect(getConditions(query)['status']).toBe('confirmed');
    // Confirm it is a strict string equality, not an operator object.
    expect(typeof getConditions(query)['status']).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Section 4 – markOverdueObligations unit tests (mock-based, no DB required)
// ---------------------------------------------------------------------------
describe('markOverdueObligations (mock-based): correct query structure and return value', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns 0 when no obligations are modified', async () => {
    jest.doMock('../../src/models/Obligation', () => ({
      Obligation: {
        updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      },
    }));

    const { markOverdueObligations } = await import('../../src/services/obligation.service');
    const count = await markOverdueObligations(new Date());
    expect(count).toBe(0);
  });

  it('returns the modifiedCount reported by Mongoose', async () => {
    jest.doMock('../../src/models/Obligation', () => ({
      Obligation: {
        updateMany: jest.fn().mockResolvedValue({ modifiedCount: 3 }),
      },
    }));

    const { markOverdueObligations } = await import('../../src/services/obligation.service');
    const count = await markOverdueObligations(new Date());
    expect(count).toBe(3);
  });

  it('calls updateMany with status "confirmed" and a deadline operator sub-document', async () => {
    const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    jest.doMock('../../src/models/Obligation', () => ({
      Obligation: { updateMany },
    }));

    const { markOverdueObligations } = await import('../../src/services/obligation.service');
    const reference = new Date('2026-10-02T11:00:00.000Z');
    await markOverdueObligations(reference);

    expect(updateMany).toHaveBeenCalledTimes(1);
    const [filter, update] = updateMany.mock.calls[0] as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];

    // Status filter must be exactly 'confirmed'.
    expect(filter['status']).toBe('confirmed');

    // The deadline value must be an object (operator sub-document).
    expect(typeof filter['deadline']).toBe('object');
    expect(filter['deadline']).not.toBeNull();

    // Update must set status to 'overdue'.
    expect(update).toEqual({ $set: { status: 'overdue' } });
  });

  it('passes the exact reference date through to the $lt boundary', async () => {
    const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
    jest.doMock('../../src/models/Obligation', () => ({
      Obligation: { updateMany },
    }));

    const { markOverdueObligations } = await import('../../src/services/obligation.service');
    const reference = new Date('2026-10-02T11:00:00.003Z');
    await markOverdueObligations(reference);

    const [filter] = updateMany.mock.calls[0] as [Record<string, unknown>];
    const deadlineCond = filter['deadline'] as Record<string, unknown>;
    const ltValue = deadlineCond['$lt'] as Date | undefined;

    // $lt must be the exact reference date (not undefined, not mangled).
    expect(ltValue).toBeInstanceOf(Date);
    expect(ltValue!.toISOString()).toBe('2026-10-02T11:00:00.003Z');
  });

  it('uses a default Date (now) when no reference argument is provided', async () => {
    const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
    jest.doMock('../../src/models/Obligation', () => ({
      Obligation: { updateMany },
    }));

    const before = Date.now();
    const { markOverdueObligations } = await import('../../src/services/obligation.service');
    await markOverdueObligations(); // no arg → default new Date()
    const after = Date.now();

    const [filter] = updateMany.mock.calls[0] as [Record<string, unknown>];
    const deadlineCond = filter['deadline'] as Record<string, unknown>;
    const ltValue = (deadlineCond['$lt'] as Date).getTime();

    expect(ltValue).toBeGreaterThanOrEqual(before);
    expect(ltValue).toBeLessThanOrEqual(after);
  });
});
