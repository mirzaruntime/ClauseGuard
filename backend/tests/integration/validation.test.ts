import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

/** Validation runs before any database access, so these need no MongoDB. */
describe('registration validation', () => {
  it('rejects a malformed email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'not-an-email', password: 'ValidPass123' });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'body.email' })]),
    );
  });

  it('rejects a weak password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'short' });

    expect(response.status).toBe(422);
    expect(response.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'body.password' })]),
    );
  });

  it('rejects a password with no uppercase letter or digit', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'alllowercase' });
    expect(response.status).toBe(422);
  });

  it('rejects a missing body entirely', async () => {
    const response = await request(app).post('/api/auth/register').send({});
    expect(response.status).toBe(422);
  });

  it('rejects malformed JSON safely', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name": "Ada",,}');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body).not.toHaveProperty('stack');
  });

  it('rejects an injected query operator in place of a string', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password: { $ne: null } });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });
});

describe('response envelope', () => {
  it('uses the documented error shape', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'x' });
    expect(response.body).toMatchObject({
      success: false,
      message: expect.any(String),
      code: expect.any(String),
    });
  });
});
