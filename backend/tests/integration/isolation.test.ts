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

const app = createApp();

/**
 * The central security property: user A must never be able to read, modify or
 * delete anything belonging to user B.
 */
describeWithDb('cross-user resource isolation (database-backed)', () => {
  beforeAll(async () => connectTestDatabase());
  beforeEach(() => installStubAiProvider());
  afterEach(async () => {
    resetAiProvider();
    await clearTestDatabase();
  });
  afterAll(async () => disconnectTestDatabase());

  async function seedUserAResources() {
    const userA = await registerActor(app, 'User A');
    const userB = await registerActor(app, 'User B');

    const upload = await request(app)
      .post('/api/contracts/upload')
      .set('Authorization', userA.auth())
      .field('title', 'Private Agreement')
      .attach(UPLOAD_FIELD_NAME, buildTestPdf(), {
        filename: 'private.pdf',
        contentType: 'application/pdf',
      });

    const contractId = upload.body.data.contract.id as string;
    await waitForContractStatus(app, userA, contractId);

    const obligations = await request(app)
      .get(`/api/obligations?contractId=${contractId}`)
      .set('Authorization', userA.auth());
    const obligationId = obligations.body.data.obligations[0].id as string;

    const reminder = await request(app)
      .post('/api/reminders')
      .set('Authorization', userA.auth())
      .send({
        obligationId,
        reminderDate: new Date(Date.now() + 86_400_000).toISOString(),
        message: 'Private reminder',
      });

    return {
      userA,
      userB,
      contractId,
      obligationId,
      reminderId: reminder.body.data.reminder.id as string,
    };
  }

  it('hides another user\u2019s contract', async () => {
    const { userB, contractId } = await seedUserAResources();

    const read = await request(app)
      .get(`/api/contracts/${contractId}`)
      .set('Authorization', userB.auth());
    expect(read.status).toBe(404);
    expect(read.body.code).toBe('CONTRACT_NOT_FOUND');

    const list = await request(app).get('/api/contracts').set('Authorization', userB.auth());
    expect(list.body.data.contracts).toHaveLength(0);
  });

  it('prevents deleting another user\u2019s contract', async () => {
    const { userA, userB, contractId } = await seedUserAResources();

    const attempt = await request(app)
      .delete(`/api/contracts/${contractId}`)
      .set('Authorization', userB.auth());
    expect(attempt.status).toBe(404);

    // The contract still belongs to its owner.
    const stillThere = await request(app)
      .get(`/api/contracts/${contractId}`)
      .set('Authorization', userA.auth());
    expect(stillThere.status).toBe(200);
  });

  it('hides another user\u2019s obligations', async () => {
    const { userB, obligationId } = await seedUserAResources();

    const read = await request(app)
      .get(`/api/obligations/${obligationId}`)
      .set('Authorization', userB.auth());
    expect(read.status).toBe(404);

    const list = await request(app).get('/api/obligations').set('Authorization', userB.auth());
    expect(list.body.data.obligations).toHaveLength(0);
  });

  it('prevents modifying another user\u2019s obligation', async () => {
    const { userA, userB, obligationId } = await seedUserAResources();

    const attempt = await request(app)
      .patch(`/api/obligations/${obligationId}`)
      .set('Authorization', userB.auth())
      .send({ status: 'confirmed', title: 'Hijacked' });
    expect(attempt.status).toBe(404);

    const unchanged = await request(app)
      .get(`/api/obligations/${obligationId}`)
      .set('Authorization', userA.auth());
    expect(unchanged.body.data.obligation.title).not.toBe('Hijacked');
    expect(unchanged.body.data.obligation.status).toBe('potential');
  });

  it('hides and protects another user\u2019s reminders', async () => {
    const { userB, reminderId } = await seedUserAResources();

    const read = await request(app)
      .get(`/api/reminders/${reminderId}`)
      .set('Authorization', userB.auth());
    expect(read.status).toBe(404);

    const update = await request(app)
      .patch(`/api/reminders/${reminderId}`)
      .set('Authorization', userB.auth())
      .send({ message: 'Hijacked' });
    expect(update.status).toBe(404);

    const remove = await request(app)
      .delete(`/api/reminders/${reminderId}`)
      .set('Authorization', userB.auth());
    expect(remove.status).toBe(404);

    const list = await request(app).get('/api/reminders').set('Authorization', userB.auth());
    expect(list.body.data.reminders).toHaveLength(0);
  });

  it('prevents attaching a reminder to another user\u2019s obligation', async () => {
    const { userB, obligationId } = await seedUserAResources();

    const response = await request(app)
      .post('/api/reminders')
      .set('Authorization', userB.auth())
      .send({
        obligationId,
        reminderDate: new Date(Date.now() + 86_400_000).toISOString(),
      });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('OBLIGATION_NOT_FOUND');
  });

  it('scopes obligation statistics per user', async () => {
    const { userB } = await seedUserAResources();
    const stats = await request(app)
      .get('/api/obligations/stats')
      .set('Authorization', userB.auth());

    expect(stats.status).toBe(200);
    expect(stats.body.data.stats).toEqual({});
  });
});
