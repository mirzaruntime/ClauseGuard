import request from 'supertest';
import type { Express } from 'express';
import { setAiProvider } from '../../src/services/ai';
import type { AiProvider } from '../../src/services/ai';

export interface TestActor {
  id: string;
  email: string;
  token: string;
  auth: () => string;
}

let counter = 0;

export async function registerActor(app: Express, name = 'Test User'): Promise<TestActor> {
  counter += 1;
  const email = `user${counter}.${Date.now()}@example.com`;

  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'ValidPass123' });

  if (response.status !== 201) {
    throw new Error(`Failed to register test actor: ${JSON.stringify(response.body)}`);
  }

  const token = response.body.data.token as string;
  return {
    id: response.body.data.user.id as string,
    email,
    token,
    auth: () => `Bearer ${token}`,
  };
}

/** Deterministic AI provider so contract processing never hits a real network. */
export function installStubAiProvider(obligations: unknown[] = defaultObligations): void {
  const provider: AiProvider = {
    name: 'stub',
    isConfigured: () => true,
    complete: async () => ({
      rawText: JSON.stringify({
        contractSummary: 'A stubbed services agreement.',
        parties: ['Acme Ltd', 'Globex Inc'],
        obligations,
      }),
      model: 'stub-model',
      provider: 'stub',
    }),
  };
  setAiProvider(provider);
}

export const defaultObligations = [
  {
    title: 'Deliver monthly report',
    description: 'The Supplier must deliver a written report each month.',
    sourceClause: 'The Supplier shall deliver a written report to the Customer each month.',
    deadline: '2027-01-31',
    noticePeriod: null,
    conditions: [],
    confidence: 0.88,
    explanation: 'A recurring reporting duty.',
  },
  {
    title: 'Pay invoices within 30 days',
    description: 'The Customer must pay each invoice within thirty days of receipt.',
    sourceClause: 'The Customer shall pay each invoice within thirty (30) days of receipt.',
    deadline: null,
    noticePeriod: '30 days',
    conditions: ['On receipt of a valid invoice'],
    confidence: 0.92,
    explanation: 'Late payment may trigger interest.',
  },
];

/** Polls a contract until it leaves the in-flight states or the budget expires. */
export async function waitForContractStatus(
  app: Express,
  actor: TestActor,
  contractId: string,
  timeoutMs = 10_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await request(app)
      .get(`/api/contracts/${contractId}`)
      .set('Authorization', actor.auth());

    const status = response.body?.data?.contract?.status as string | undefined;
    if (status && !['uploaded', 'processing', 'analyzing'].includes(status)) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timed out waiting for contract processing to finish');
}
