import request from 'supertest';
import { createApp } from '../../src/app';
import {
  clearTestDatabase,
  connectTestDatabase,
  describeWithDb,
  disconnectTestDatabase,
} from '../helpers/database';

const app = createApp();

describeWithDb('authentication flow (database-backed)', () => {
  beforeAll(async () => connectTestDatabase());
  afterEach(async () => clearTestDatabase());
  afterAll(async () => disconnectTestDatabase());

  const credentials = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'ValidPass123' };

  it('registers a user and returns a token without the password hash', async () => {
    const response = await request(app).post('/api/auth/register').send(credentials);

    expect(response.status).toBe(201);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user.email).toBe('ada@example.com');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain(credentials.password);
  });

  it('prevents duplicate email registration', async () => {
    await request(app).post('/api/auth/register').send(credentials);
    const response = await request(app).post('/api/auth/register').send(credentials);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('normalises email case on registration and login', async () => {
    await request(app).post('/api/auth/register').send(credentials);
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ADA@Example.COM', password: credentials.password });

    expect(response.status).toBe(200);
  });

  it('rejects a wrong password without revealing that the account exists', async () => {
    await request(app).post('/api/auth/register').send(credentials);

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'WrongPass123' });
    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPass123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    // Identical responses prevent account enumeration.
    expect(wrongPassword.body.message).toBe(unknownUser.body.message);
    expect(wrongPassword.body.code).toBe(unknownUser.body.code);
  });

  it('returns the current user for a valid token', async () => {
    const registered = await request(app).post('/api/auth/register').send(credentials);
    const token = registered.body.data.token as string;

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe('ada@example.com');
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('invalidates a token whose user no longer exists', async () => {
    const registered = await request(app).post('/api/auth/register').send(credentials);
    const token = registered.body.data.token as string;

    await clearTestDatabase();

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
  });

  it('changes a password and invalidates the old one', async () => {
    const registered = await request(app).post('/api/auth/register').send(credentials);
    const token = registered.body.data.token as string;

    const changed = await request(app)
      .post('/api/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: credentials.password, newPassword: 'BrandNewPass456' });
    expect(changed.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'BrandNewPass456' });
    expect(newLogin.status).toBe(200);
  });

  it('refuses a password change with the wrong current password', async () => {
    const registered = await request(app).post('/api/auth/register').send(credentials);
    const token = registered.body.data.token as string;

    const response = await request(app)
      .post('/api/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'NotThePassword1', newPassword: 'BrandNewPass456' });

    expect(response.status).toBe(401);
  });
});
