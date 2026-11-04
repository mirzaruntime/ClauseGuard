import request from 'supertest';
import { createApp } from '../../src/app';
import {
  clearTestDatabase,
  connectTestDatabase,
  describeWithDb,
  disconnectTestDatabase,
} from '../helpers/database';
import { installStubAiProvider, registerActor, waitForContractStatus } from '../helpers/api';
import { buildTestPdf } from '../helpers/pdf';
import { resetAiProvider } from '../../src/services/ai';
import { UPLOAD_FIELD_NAME } from '../../src/middleware/upload';
import { Reminder } from '../../src/models/Reminder';
import { Obligation } from '../../src/models/Obligation';
import { dispatchDueReminders, runOverdueSweep } from '../../src/jobs';

const app = createApp();
const IN_ONE_DAY = () => new Date(Date.now() + 86_400_000).toISOString();

describeWithDb('reminder system (database-backed)', () => {
  beforeAll(async () => connectTestDatabase());
  beforeEach(() => installStubAiProvider());
  afterEach(async () => {
    resetAiProvider();
    await clearTestDatabase();
  });
  afterAll(async () => disconnectTestDatabase());

  async function seed() {
    const actor = await registerActor(app);
    const upload = await request(app)
      .post('/api/contracts/upload')
      .set('Authorization', actor.auth())
      .attach(UPLOAD_FIELD_NAME, buildTestPdf(), {
        filename: 'agreement.pdf',
        contentType: 'application/pdf',
      });

    const contractId = upload.body.data.contract.id as string;
    await waitForContractStatus(app, actor, contractId);

    const list = await request(app).get('/api/obligations').set('Authorization', actor.auth());
    const obligationId = list.body.data.obligations[0].id as string;

    await request(app)
      .patch(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth())
      .send({ status: 'confirmed' });

    return { actor, obligationId };
  }

  it('creates a reminder for an owned obligation', async () => {
    const { actor, obligationId } = await seed();

    const response = await request(app)
      .post('/api/reminders')
      .set('Authorization', actor.auth())
      .send({ obligationId, reminderDate: IN_ONE_DAY(), message: 'Send the report' });

    expect(response.status).toBe(201);
    expect(response.body.data.reminder.status).toBe('scheduled');
    expect(response.body.data.reminder.attempts).toBe(0);
  });

  it('refuses a reminder in the past', async () => {
    const { actor, obligationId } = await seed();

    const response = await request(app)
      .post('/api/reminders')
      .set('Authorization', actor.auth())
      .send({ obligationId, reminderDate: new Date(Date.now() - 86_400_000).toISOString() });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('REMINDER_DATE_IN_PAST');
  });

  it('refuses a duplicate reminder at the same time', async () => {
    const { actor, obligationId } = await seed();
    const reminderDate = IN_ONE_DAY();

    await request(app)
      .post('/api/reminders')
      .set('Authorization', actor.auth())
      .send({ obligationId, reminderDate });

    const duplicate = await request(app)
      .post('/api/reminders')
      .set('Authorization', actor.auth())
      .send({ obligationId, reminderDate });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('DUPLICATE_REMINDER');
  });

  it('cancels a scheduled reminder rather than deleting it', async () => {
    const { actor, obligationId } = await seed();
    const created = await request(app)
      .post('/api/reminders')
      .set('Authorization', actor.auth())
      .send({ obligationId, reminderDate: IN_ONE_DAY() });

    const reminderId = created.body.data.reminder.id as string;
    const response = await request(app)
      .delete(`/api/reminders/${reminderId}`)
      .set('Authorization', actor.auth());

    expect(response.status).toBe(200);
    expect(response.body.data.reminder.status).toBe('cancelled');
  });

  it('dispatches a due reminder exactly once', async () => {
    const { actor, obligationId } = await seed();
    const created = await request(app)
      .post('/api/reminders')
      .set('Authorization', actor.auth())
      .send({ obligationId, reminderDate: IN_ONE_DAY(), message: 'Due now' });

    const reminderId = created.body.data.reminder.id as string;
    // Move the reminder into the past without going through the API guard.
    await Reminder.updateOne(
      { _id: reminderId },
      { $set: { reminderDate: new Date(Date.now() - 1000) } },
    );

    const first = await dispatchDueReminders();
    expect(first.sent).toBe(1);

    // A second pass must not re-deliver it.
    const second = await dispatchDueReminders();
    expect(second.claimed).toBe(0);

    const after = await request(app)
      .get(`/api/reminders/${reminderId}`)
      .set('Authorization', actor.auth());
    expect(after.body.data.reminder.status).toBe('sent');
    expect(after.body.data.reminder.sentAt).toEqual(expect.any(String));
  });

  it('cancels delivery when the obligation was completed in the meantime', async () => {
    const { actor, obligationId } = await seed();
    const created = await request(app)
      .post('/api/reminders')
      .set('Authorization', actor.auth())
      .send({ obligationId, reminderDate: IN_ONE_DAY() });

    const reminderId = created.body.data.reminder.id as string;
    await Reminder.updateOne(
      { _id: reminderId },
      { $set: { reminderDate: new Date(Date.now() - 1000) } },
    );
    await request(app)
      .patch(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth())
      .send({ status: 'completed' });

    await dispatchDueReminders();

    const after = await request(app)
      .get(`/api/reminders/${reminderId}`)
      .set('Authorization', actor.auth());
    expect(after.body.data.reminder.status).toBe('cancelled');
  });

  it('refuses to modify a delivered reminder', async () => {
    const { actor, obligationId } = await seed();
    const created = await request(app)
      .post('/api/reminders')
      .set('Authorization', actor.auth())
      .send({ obligationId, reminderDate: IN_ONE_DAY() });

    const reminderId = created.body.data.reminder.id as string;
    await Reminder.updateOne({ _id: reminderId }, { $set: { status: 'sent' } });

    const response = await request(app)
      .patch(`/api/reminders/${reminderId}`)
      .set('Authorization', actor.auth())
      .send({ message: 'Changed' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('REMINDER_ALREADY_SENT');
  });

  it('sweeps confirmed obligations past their deadline into overdue', async () => {
    const { actor, obligationId } = await seed();
    await Obligation.updateOne(
      { _id: obligationId },
      { $set: { deadline: new Date(Date.now() - 86_400_000) } },
    );

    const updated = await runOverdueSweep();
    expect(updated).toBeGreaterThanOrEqual(1);

    const after = await request(app)
      .get(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth());
    expect(after.body.data.obligation.status).toBe('overdue');
  });
});
