import request from 'supertest';
import { createApp } from '../../src/app';
import { Contract } from '../../src/models/Contract';
import { Obligation } from '../../src/models/Obligation';
import { Reminder } from '../../src/models/Reminder';
import { User } from '../../src/models/User';
import { dispatchDueReminders } from '../../src/jobs/reminder.job';
import { env } from '../../src/config/env';
import { hashPassword } from '../../src/utils/password';
import { signAccessToken } from '../../src/utils/jwt';
import {
  clearTestDatabase,
  connectTestDatabase,
  describeWithDb,
  disconnectTestDatabase,
} from '../helpers/database';

const app = createApp();
const FIXED_NOW = new Date('2027-06-15T12:00:00.000Z');
const DUE_DATE = new Date('2027-06-15T11:00:00.000Z');
const FUTURE_DATE = new Date('2027-06-15T13:00:00.000Z');
let ownerEmailSequence = 0;

describeWithDb('reminder dispatch integration (isolated MongoDB)', () => {
  let fetchMock: jest.SpyInstance<ReturnType<typeof fetch>, Parameters<typeof fetch>>;
  let savedApiKey: string | undefined;
  let savedEmailFrom: string | undefined;

  beforeAll(async () => {
    await connectTestDatabase();
    savedApiKey = env.RESEND_API_KEY;
    savedEmailFrom = env.EMAIL_FROM;
    env.RESEND_API_KEY = 'test-only-resend-key';
    env.EMAIL_FROM = 'ClauseGuard <test@example.com>';
  });

  beforeEach(async () => {
    ownerEmailSequence = 0;
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 } as Response);
  });

  afterEach(async () => {
    fetchMock.mockRestore();
    await clearTestDatabase();
  });

  afterAll(async () => {
    env.RESEND_API_KEY = savedApiKey;
    env.EMAIL_FROM = savedEmailFrom;
    await disconnectTestDatabase();
  });

  async function seedReminder(options: {
    reminderDate?: Date;
    status?: 'scheduled' | 'cancelled';
    claimedAt?: Date | null;
    attempts?: number;
    email?: string;
  } = {}) {
    const owner = await User.create({
      name: 'Reminder Owner',
      email: options.email ?? `owner-${ownerEmailSequence++}@example.com`,
      passwordHash: await hashPassword('TestPassword123'),
    });
    const contract = await Contract.create({
      ownerId: owner._id,
      title: 'Test Contract',
      originalFileName: 'test.pdf',
      fileReference: `${owner.id}/test.pdf`,
      mimeType: 'application/pdf',
      fileSize: 100,
      checksum: 'test-checksum',
      status: 'review',
    });
    const obligation = await Obligation.create({
      contractId: contract._id,
      ownerId: owner._id,
      title: 'Renewal notice',
      description: 'Provide renewal notice.',
      status: 'confirmed',
      deadline: new Date('2027-07-01T00:00:00.000Z'),
    });
    const reminder = await Reminder.create({
      obligationId: obligation._id,
      contractId: contract._id,
      ownerId: owner._id,
      reminderDate: options.reminderDate ?? DUE_DATE,
      status: options.status ?? 'scheduled',
      channel: 'email',
      message: 'Send the renewal notice.',
      claimedAt: options.claimedAt ?? null,
      attempts: options.attempts ?? 0,
    });
    return { owner, contract, obligation, reminder };
  }

  it('claims and dispatches due email reminder, persisting sent status and attempt count', async () => {
    const { reminder } = await seedReminder();
    const summary = await dispatchDueReminders(FIXED_NOW);
    const saved = await Reminder.findById(reminder._id).lean();

    expect(summary).toMatchObject({ claimed: 1, sent: 1, failed: 0 });
    expect(saved).toMatchObject({ status: 'sent', attempts: 1, claimedAt: null });
    expect(saved?.sentAt).toBeInstanceOf(Date);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('increments attempts and returns failed delivery to scheduled while retries remain', async () => {
    const { reminder } = await seedReminder({ attempts: 0 });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ name: 'validation_error', message: 'safe mocked rejection' }),
    } as unknown as Response);

    const summary = await dispatchDueReminders(FIXED_NOW);
    const saved = await Reminder.findById(reminder._id).lean();
    expect(summary.retrying).toBe(1);
    expect(saved).toMatchObject({ status: 'scheduled', attempts: 1, claimedAt: FIXED_NOW });
    expect(saved?.lastError).toContain('EMAIL_PROVIDER_REJECTED');
  });

  it('marks delivery failed when the claimed attempt reaches REMINDER_MAX_ATTEMPTS', async () => {
    const { reminder } = await seedReminder({ attempts: env.REMINDER_MAX_ATTEMPTS - 1 });
    fetchMock.mockRejectedValue(new Error('mock network failure'));

    const summary = await dispatchDueReminders(FIXED_NOW);
    const saved = await Reminder.findById(reminder._id).lean();
    expect(summary.failed).toBe(1);
    expect(saved).toMatchObject({ status: 'failed', attempts: env.REMINDER_MAX_ATTEMPTS, claimedAt: null });
  });

  it('does not reclaim a reminder with a current claim', async () => {
    const { reminder } = await seedReminder({ claimedAt: new Date(FIXED_NOW.getTime() - 60_000) });
    const summary = await dispatchDueReminders(FIXED_NOW);
    const saved = await Reminder.findById(reminder._id).lean();
    expect(summary.claimed).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(saved).toMatchObject({ status: 'scheduled', attempts: 0 });
  });

  it('recovers a stale claim and dispatches it', async () => {
    const staleClaim = new Date(FIXED_NOW.getTime() - 5 * 60_000 - 1);
    const { reminder } = await seedReminder({ claimedAt: staleClaim });
    const summary = await dispatchDueReminders(FIXED_NOW);
    const saved = await Reminder.findById(reminder._id).lean();
    expect(summary.sent).toBe(1);
    expect(saved).toMatchObject({ status: 'sent', attempts: 1, claimedAt: null });
  });

  it('does not dispatch future or cancelled reminders', async () => {
    const future = await seedReminder({ reminderDate: FUTURE_DATE });
    const cancelled = await seedReminder({ status: 'cancelled' });
    const summary = await dispatchDueReminders(FIXED_NOW);
    const [savedFuture, savedCancelled] = await Promise.all([
      Reminder.findById(future.reminder._id).lean(),
      Reminder.findById(cancelled.reminder._id).lean(),
    ]);
    expect(summary.claimed).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(savedFuture).toMatchObject({ status: 'scheduled', attempts: 0 });
    expect(savedCancelled).toMatchObject({ status: 'cancelled', attempts: 0 });
  });

  it('prevents cross-owner access and sends email only to the reminder owner', async () => {
    const { owner, reminder } = await seedReminder({ email: 'real-owner@example.com' });
    const other = await User.create({
      name: 'Other User', email: 'other@example.com',
      passwordHash: await hashPassword('TestPassword123'),
    });
    const token = signAccessToken({ sub: String(other._id), email: other.email });

    const access = await request(app)
      .get(`/api/reminders/${reminder.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(access.status).toBe(404);

    const summary = await dispatchDueReminders(FIXED_NOW);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { to: string[] };
    expect(summary.sent).toBe(1);
    expect(body.to).toEqual([owner.email]);
    expect(body.to).not.toContain(other.email);
  });

  it('does not dispatch the same successful reminder a second time', async () => {
    const { reminder } = await seedReminder();
    const first = await dispatchDueReminders(FIXED_NOW);
    const second = await dispatchDueReminders(FIXED_NOW);
    const saved = await Reminder.findById(reminder._id).lean();
    expect(first.sent).toBe(1);
    expect(second.claimed).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(saved?.attempts).toBe(1);
  });
});
