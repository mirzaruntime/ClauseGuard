import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';
import { User } from '../../src/models/User';
import { hashPasswordResetToken } from '../../src/utils/passwordResetToken';
import { sendPasswordResetEmail } from '../../src/services/email.service';
import {
  clearTestDatabase,
  connectTestDatabase,
  describeWithDb,
  disconnectTestDatabase,
} from '../helpers/database';

jest.mock('../../src/services/email.service', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

const app = createApp();
const sendResetEmailMock = jest.mocked(sendPasswordResetEmail);

describeWithDb('password reset flow (database-backed)', () => {
  beforeAll(async () => connectTestDatabase());
  beforeEach(() => sendResetEmailMock.mockReset().mockResolvedValue(true));
  afterEach(async () => clearTestDatabase());
  afterAll(async () => disconnectTestDatabase());

  const credentials = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'ValidPass123',
  };

  async function registerAndRequestReset() {
    const registered = await request(app).post('/api/auth/register').send(credentials);
    expect(registered.status).toBe(201);

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: ' ADA@Example.COM ' });
    expect(response.status).toBe(202);

    const emailCall = sendResetEmailMock.mock.calls[0]?.[0];
    if (!emailCall) throw new Error('Expected a reset email request');
    const token = new URL(emailCall.resetUrl).searchParams.get('token');
    if (!token) throw new Error('Expected a token in the email reset link');

    return { oldJwt: registered.body.data.token as string, token };
  }

  it('returns the same generic response for known and unknown addresses', async () => {
    await request(app).post('/api/auth/register').send(credentials);

    const known = await request(app).post('/api/auth/forgot-password').send({ email: credentials.email });
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });

    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(known.body).toEqual(unknown.body);
    expect(known.body.message).toBe(
      'If an account exists with this email address and email delivery is available, a password reset link will be sent shortly.',
    );
    expect(sendResetEmailMock).toHaveBeenCalledTimes(1);
  });

  it.each(['', 'not-an-email'])('validates forgot-password email: %s', async (email) => {
    const response = await request(app).post('/api/auth/forgot-password').send({ email });
    expect(response.status).toBe(422);
  });

  it('stores only the reset-token digest and sets a 15-minute expiry', async () => {
    await registerAndRequestReset();
    const token = new URL(sendResetEmailMock.mock.calls[0][0].resetUrl).searchParams.get('token')!;
    const user = await User.findOne({ email: credentials.email }).select(
      '+resetPasswordTokenHash +resetPasswordExpiresAt',
    );

    expect(user?.resetPasswordTokenHash).toBe(hashPasswordResetToken(token));
    expect(user?.resetPasswordTokenHash).not.toBe(token);
    expect(user?.resetPasswordExpiresAt!.getTime()).toBeGreaterThan(Date.now() + 14 * 60_000);
    expect(user?.resetPasswordExpiresAt!.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60_000);
    expect(JSON.stringify(user)).not.toContain(token);
  });

  it('invalidates any earlier link when a new reset email is requested', async () => {
    await request(app).post('/api/auth/register').send(credentials);
    await request(app).post('/api/auth/forgot-password').send({ email: credentials.email });
    const firstToken = new URL(sendResetEmailMock.mock.calls[0][0].resetUrl).searchParams.get('token')!;

    await request(app).post('/api/auth/forgot-password').send({ email: credentials.email });
    const secondToken = new URL(sendResetEmailMock.mock.calls[1][0].resetUrl).searchParams.get('token')!;
    expect(secondToken).not.toBe(firstToken);

    const oldLink = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: firstToken, password: 'NewSecurePass456' });
    expect(oldLink.status).toBe(400);
  });

  it('does not leave a usable token behind if Resend rejects the email', async () => {
    await request(app).post('/api/auth/register').send(credentials);
    sendResetEmailMock.mockResolvedValueOnce(false);

    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: credentials.email });
    expect(response.status).toBe(202);
    expect(response.body.message).toBe(
      'If an account exists with this email address and email delivery is available, a password reset link will be sent shortly.',
    );

    const user = await User.findOne({ email: credentials.email }).select(
      '+resetPasswordTokenHash +resetPasswordExpiresAt',
    );
    expect(user?.resetPasswordTokenHash).toBeUndefined();
    expect(user?.resetPasswordExpiresAt).toBeUndefined();
  });

  it('rejects malformed, invalid and expired reset tokens', async () => {
    await request(app).post('/api/auth/register').send(credentials);
    const malformed = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'short', password: 'NewSecurePass456' });
    expect(malformed.status).toBe(422);

    const invalid = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'a'.repeat(43), password: 'NewSecurePass456' });
    expect(invalid.status).toBe(400);

    await request(app).post('/api/auth/forgot-password').send({ email: credentials.email });
    const token = new URL(sendResetEmailMock.mock.calls[0][0].resetUrl).searchParams.get('token')!;
    await User.updateOne(
      { email: credentials.email },
      { $set: { resetPasswordExpiresAt: new Date(Date.now() - 1_000) } },
    );

    const expired = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'NewSecurePass456' });
    expect(expired.status).toBe(400);
    expect(expired.body.code).toBe('INVALID_RESET_TOKEN');
  });

  it.each(['short', 'alllowercase123', 'ALLUPPERCASE123', 'NoDigitsHere'])(
    'rejects a password that violates the registration policy: %s',
    async (password) => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'a'.repeat(43), password });
      expect(response.status).toBe(422);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    },
  );

  it('atomically permits only one of two concurrent reset attempts', async () => {
    const { token } = await registerAndRequestReset();
    const attempts = await Promise.all([
      request(app).post('/api/auth/reset-password').send({ token, password: 'FirstSecurePass456' }),
      request(app).post('/api/auth/reset-password').send({ token, password: 'SecondSecurePass456' }),
    ]);

    expect(attempts.map((response) => response.status).sort()).toEqual([200, 400]);
    const [firstLogin, secondLogin] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: credentials.email, password: 'FirstSecurePass456' }),
      request(app).post('/api/auth/login').send({ email: credentials.email, password: 'SecondSecurePass456' }),
    ]);
    expect([firstLogin.status, secondLogin.status].filter((status) => status === 200)).toHaveLength(1);
  });

  it('changes the password, consumes the token, and invalidates existing JWTs', async () => {
    const { oldJwt, token } = await registerAndRequestReset();
    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'BrandNewPass456' });
    expect(reset.status).toBe(200);

    const oldTokenRequest = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldJwt}`);
    expect(oldTokenRequest.status).toBe(401);

    const oldPasswordLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'BrandNewPass456' });
    expect(newPasswordLogin.status).toBe(200);
    expect(
      (await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newPasswordLogin.body.data.token}`)).status,
    ).toBe(200);

    const reused = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'AnotherSecurePass789' });
    expect(reused.status).toBe(400);
  });

  it('accepts legacy version-zero JWTs for existing users before a reset', async () => {
    const registered = await request(app).post('/api/auth/register').send(credentials);
    const legacyToken = jwt.sign(
      { email: credentials.email },
      process.env.JWT_SECRET as string,
      { subject: registered.body.data.user.id, issuer: 'clauseguard', expiresIn: '1h' },
    );

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${legacyToken}`);
    expect(response.status).toBe(200);
  });
});
