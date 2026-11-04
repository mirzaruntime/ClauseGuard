import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('health endpoints', () => {
  it('GET /api/health returns the documented payload', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'ClauseGuard API is running' });
  });

  it('GET /api/health/ready reports dependency state', async () => {
    const response = await request(app).get('/api/health/ready');
    // 503 without a database connection is the correct readiness answer.
    expect([200, 503]).toContain(response.status);
    expect(response.body.data).toHaveProperty('database');
    expect(response.body.data).toHaveProperty('aiConfigured');
  });

  it('does not advertise the server technology', async () => {
    const response = await request(app).get('/api/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('sets security headers', async () => {
    const response = await request(app).get('/api/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('attaches a request id to every response', async () => {
    const response = await request(app).get('/api/health');
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('unknown routes', () => {
  it('returns a structured 404', async () => {
    const response = await request(app).get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('ROUTE_NOT_FOUND');
  });
});
