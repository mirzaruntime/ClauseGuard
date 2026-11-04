import request, { type Test } from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';

const app = createApp();

/**
 * These cases are rejected by validation or JWT verification before any
 * database access, so they run without a MongoDB instance.
 */
const PROTECTED_ROUTES: { name: string; call: () => Test }[] = [
  { name: 'GET /api/auth/me', call: () => request(app).get('/api/auth/me') },
  { name: 'GET /api/contracts', call: () => request(app).get('/api/contracts') },
  { name: 'POST /api/contracts/upload', call: () => request(app).post('/api/contracts/upload') },
  { name: 'GET /api/obligations', call: () => request(app).get('/api/obligations') },
  { name: 'GET /api/obligations/stats', call: () => request(app).get('/api/obligations/stats') },
  { name: 'GET /api/reminders', call: () => request(app).get('/api/reminders') },
  { name: 'POST /api/reminders', call: () => request(app).post('/api/reminders') },
  { name: 'PATCH /api/users/me', call: () => request(app).patch('/api/users/me') },
];

describe('unauthenticated access is rejected', () => {
  it.each(PROTECTED_ROUTES)('$name requires a token', async ({ call }) => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('MISSING_TOKEN');
  });
});

describe('invalid tokens are rejected', () => {
  it('rejects a malformed token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_TOKEN');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwt.sign({ email: 'attacker@example.com' }, 'some-other-secret-value-32-chars-x', {
      subject: '507f1f77bcf86cd799439011',
      issuer: 'clauseguard',
    });
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_TOKEN');
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ email: 'user@example.com' }, process.env.JWT_SECRET as string, {
      subject: '507f1f77bcf86cd799439011',
      issuer: 'clauseguard',
      expiresIn: '-1h',
    });
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expired}`);
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects a non-bearer scheme', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', 'Basic abc123');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('MISSING_TOKEN');
  });

  it('never returns a stack trace or secret in the error body', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', 'Bearer bad');
    expect(JSON.stringify(response.body)).not.toContain(process.env.JWT_SECRET as string);
    expect(response.body).not.toHaveProperty('stack');
  });
});
