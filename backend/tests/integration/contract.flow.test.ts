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
import { resetAiProvider, setAiProvider } from '../../src/services/ai';
import { UPLOAD_FIELD_NAME } from '../../src/middleware/upload';
import { ApiError } from '../../src/utils/ApiError';

const app = createApp();

async function uploadContract(actor: TestActor, title = 'Services Agreement') {
  return request(app)
    .post('/api/contracts/upload')
    .set('Authorization', actor.auth())
    .field('title', title)
    .attach(UPLOAD_FIELD_NAME, buildTestPdf(), {
      filename: 'services-agreement.pdf',
      contentType: 'application/pdf',
    });
}

describeWithDb('contract pipeline (database-backed)', () => {
  beforeAll(async () => connectTestDatabase());
  beforeEach(() => installStubAiProvider());
  afterEach(async () => {
    resetAiProvider();
    await clearTestDatabase();
  });
  afterAll(async () => disconnectTestDatabase());

  it('uploads a contract, analyses it and leaves obligations awaiting review', async () => {
    const actor = await registerActor(app);
    const upload = await uploadContract(actor);

    expect(upload.status).toBe(201);
    expect(upload.body.data.contract.status).toBe('uploaded');
    expect(upload.body.data.disclaimer).toMatch(/not legal advice/i);
    // The internal storage key must never be exposed.
    expect(upload.body.data.contract).not.toHaveProperty('fileReference');

    const contractId = upload.body.data.contract.id as string;
    const status = await waitForContractStatus(app, actor, contractId);
    expect(status).toBe('review');

    const obligations = await request(app)
      .get(`/api/obligations?contractId=${contractId}`)
      .set('Authorization', actor.auth());

    expect(obligations.status).toBe(200);
    expect(obligations.body.data.obligations).toHaveLength(2);
    // AI output is never auto-confirmed.
    for (const obligation of obligations.body.data.obligations) {
      expect(obligation.status).toBe('potential');
      expect(obligation.aiGenerated).toBe(true);
      expect(obligation.sourceClause).toEqual(expect.any(String));
    }
  });

  it('records a failure on the contract when the AI provider errors', async () => {
    setAiProvider({
      name: 'failing',
      isConfigured: () => true,
      complete: async () => {
        throw ApiError.serviceUnavailable('AI analysis timed out', 'AI_TIMEOUT');
      },
    });

    const actor = await registerActor(app);
    const upload = await uploadContract(actor);
    const contractId = upload.body.data.contract.id as string;

    const status = await waitForContractStatus(app, actor, contractId);
    expect(status).toBe('failed');

    const details = await request(app)
      .get(`/api/contracts/${contractId}`)
      .set('Authorization', actor.auth());

    expect(details.body.data.contract.processingError.stage).toBe('analysis');
    expect(details.body.data.contract.processingError.code).toBe('AI_TIMEOUT');
  });

  it('lists and paginates only the owner\u2019s contracts', async () => {
    const actor = await registerActor(app);
    await uploadContract(actor, 'Alpha Agreement');
    await uploadContract(actor, 'Beta Agreement');

    const response = await request(app)
      .get('/api/contracts?limit=1&page=1')
      .set('Authorization', actor.auth());

    expect(response.status).toBe(200);
    expect(response.body.data.contracts).toHaveLength(1);
    expect(response.body.pagination).toMatchObject({ page: 1, limit: 1, total: 2, totalPages: 2 });
  });

  it('filters contracts by title search', async () => {
    const actor = await registerActor(app);
    await uploadContract(actor, 'Alpha Agreement');
    await uploadContract(actor, 'Beta Agreement');

    const response = await request(app)
      .get('/api/contracts?search=Alpha')
      .set('Authorization', actor.auth());

    expect(response.body.data.contracts).toHaveLength(1);
    expect(response.body.data.contracts[0].title).toBe('Alpha Agreement');
  });

  it('deletes a contract along with its obligations', async () => {
    const actor = await registerActor(app);
    const upload = await uploadContract(actor);
    const contractId = upload.body.data.contract.id as string;
    await waitForContractStatus(app, actor, contractId);

    const deleted = await request(app)
      .delete(`/api/contracts/${contractId}`)
      .set('Authorization', actor.auth());
    expect(deleted.status).toBe(200);

    const after = await request(app)
      .get(`/api/obligations?contractId=${contractId}`)
      .set('Authorization', actor.auth());
    expect(after.body.data.obligations).toHaveLength(0);
  });

  it('rejects a malformed contract id', async () => {
    const actor = await registerActor(app);
    const response = await request(app)
      .get('/api/contracts/not-an-id')
      .set('Authorization', actor.auth());

    expect(response.status).toBe(422);
  });
});
