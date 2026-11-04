import request from 'supertest';
import { createApp } from '../../src/app';
import {
  clearTestDatabase,
  connectTestDatabase,
  describeWithDb,
  disconnectTestDatabase,
} from '../helpers/database';
import {
  installStubAiProvider,
  registerActor,
  waitForContractStatus,
  type TestActor,
} from '../helpers/api';
import { buildTestPdf } from '../helpers/pdf';
import { resetAiProvider } from '../../src/services/ai';
import { UPLOAD_FIELD_NAME } from '../../src/middleware/upload';

const app = createApp();

describeWithDb('obligation review workflow (database-backed)', () => {
  beforeAll(async () => connectTestDatabase());
  beforeEach(() => installStubAiProvider());
  afterEach(async () => {
    resetAiProvider();
    await clearTestDatabase();
  });
  afterAll(async () => disconnectTestDatabase());

  async function seedObligation(): Promise<{ actor: TestActor; obligationId: string }> {
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
    return { actor, obligationId: list.body.data.obligations[0].id as string };
  }

  it('confirms a potential obligation and stamps the review time', async () => {
    const { actor, obligationId } = await seedObligation();

    const response = await request(app)
      .patch(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth())
      .send({ status: 'confirmed' });

    expect(response.status).toBe(200);
    expect(response.body.data.obligation.status).toBe('confirmed');
    expect(response.body.data.obligation.reviewedAt).toEqual(expect.any(String));
  });

  it('preserves AI provenance when a human edits the obligation', async () => {
    const { actor, obligationId } = await seedObligation();

    const before = await request(app)
      .get(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth());
    const originalClause = before.body.data.obligation.sourceClause;
    const originalConfidence = before.body.data.obligation.confidence;

    const response = await request(app)
      .patch(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth())
      .send({ title: 'Deliver the monthly report to Finance', status: 'confirmed' });

    expect(response.status).toBe(200);
    expect(response.body.data.obligation.title).toBe('Deliver the monthly report to Finance');
    expect(response.body.data.obligation.editedByUser).toBe(true);
    // Provenance is immutable through this endpoint.
    expect(response.body.data.obligation.sourceClause).toBe(originalClause);
    expect(response.body.data.obligation.confidence).toBe(originalConfidence);
    expect(response.body.data.obligation.aiExplanation).toEqual(expect.any(String));
  });

  it('refuses an invalid status transition', async () => {
    const { actor, obligationId } = await seedObligation();

    const response = await request(app)
      .patch(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth())
      .send({ status: 'completed' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('walks the full review path: potential -> confirmed -> completed', async () => {
    const { actor, obligationId } = await seedObligation();

    await request(app)
      .patch(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth())
      .send({ status: 'confirmed' });

    const completed = await request(app)
      .patch(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth())
      .send({ status: 'completed' });

    expect(completed.status).toBe(200);
    expect(completed.body.data.obligation.status).toBe('completed');
    expect(completed.body.data.obligation.completedAt).toEqual(expect.any(String));
  });

  it('cancels scheduled reminders when an obligation is rejected', async () => {
    const { actor, obligationId } = await seedObligation();

    const reminder = await request(app)
      .post('/api/reminders')
      .set('Authorization', actor.auth())
      .send({
        obligationId,
        reminderDate: new Date(Date.now() + 86_400_000).toISOString(),
      });
    const reminderId = reminder.body.data.reminder.id as string;

    await request(app)
      .patch(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth())
      .send({ status: 'rejected' });

    const after = await request(app)
      .get(`/api/reminders/${reminderId}`)
      .set('Authorization', actor.auth());

    expect(after.body.data.reminder.status).toBe('cancelled');
  });

  it('refuses to set the derived overdue status directly', async () => {
    const { actor, obligationId } = await seedObligation();

    await request(app)
      .patch(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth())
      .send({ status: 'confirmed' });

    const response = await request(app)
      .patch(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth())
      .send({ status: 'overdue' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('STATUS_NOT_USER_ASSIGNABLE');
  });

  it('rejects an empty update body', async () => {
    const { actor, obligationId } = await seedObligation();

    const response = await request(app)
      .patch(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth())
      .send({});

    expect(response.status).toBe(422);
  });

  it('reports per-status statistics for the owner', async () => {
    const { actor, obligationId } = await seedObligation();

    await request(app)
      .patch(`/api/obligations/${obligationId}`)
      .set('Authorization', actor.auth())
      .send({ status: 'confirmed' });

    const stats = await request(app)
      .get('/api/obligations/stats')
      .set('Authorization', actor.auth());

    expect(stats.body.data.stats.confirmed).toBe(1);
    expect(stats.body.data.stats.potential).toBe(1);
  });
});
