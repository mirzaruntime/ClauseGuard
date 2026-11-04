import { sendPasswordResetEmail } from '../../src/services/email.service';
import { env } from '../../src/config/env';
import { logger } from '../../src/utils/logger';

jest.mock('../../src/config/env', () => ({
  env: {
    RESEND_API_KEY: 'test-resend-key',
    EMAIL_FROM: 'ClauseGuard <notifications@example.com>',
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe('password reset email service', () => {
  let fetchMock: jest.SpyInstance<ReturnType<typeof fetch>, Parameters<typeof fetch>>;
  const loggerMock = jest.mocked(logger);

  beforeEach(() => {
    // Jest's restoreMocks restores spies before each test, so recreate it here.
    fetchMock = jest.spyOn(global, 'fetch').mockReset();
    loggerMock.warn.mockClear();
    loggerMock.info.mockClear();
    env.RESEND_API_KEY = 'test-resend-key';
    env.EMAIL_FROM = 'ClauseGuard <notifications@example.com>';
  });

  afterAll(() => fetchMock.mockRestore());

  it('sends the reset email through Resend without logging the recipient or URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ id: '26abdd24-36a9-475d-83bf-4d27a31c7def' }),
    } as unknown as Response);
    const resetUrl = 'https://app.example.com/reset-password?token=never-log-this-token';

    await expect(
      sendPasswordResetEmail({ to: 'person@example.com', resetUrl }),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-resend-key' }),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(loggerMock.warn).not.toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith('auth.password_reset.email_sent', {
      provider: 'resend',
      httpStatus: 200,
      emailId: '26abdd24-36a9-475d-83bf-4d27a31c7def',
    });
    expect(JSON.stringify(loggerMock.info.mock.calls)).not.toContain('never-log-this-token');
    expect(JSON.stringify(loggerMock.info.mock.calls)).not.toContain('person@example.com');
  });

  it('reports provider rejection using only allowlisted error details', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: jest.fn().mockResolvedValue({
        name: 'domain_not_verified',
        message: 'Do not log this raw message or any recipient details.',
      }),
    } as unknown as Response);
    const resetUrl = 'https://app.example.com/reset-password?token=never-log-this-token';

    await expect(
      sendPasswordResetEmail({ to: 'person@example.com', resetUrl }),
    ).resolves.toBe(false);

    expect(loggerMock.warn).toHaveBeenCalledWith('auth.password_reset.email_failed', {
      provider: 'resend',
      reasonCode: 'EMAIL_DELIVERY_FAILED',
      httpStatus: 422,
      providerCode: 'domain_not_verified',
      providerMessage: 'The sender domain is not verified with the provider.',
    });
    expect(JSON.stringify(loggerMock.warn.mock.calls)).not.toContain('never-log-this-token');
    expect(JSON.stringify(loggerMock.warn.mock.calls)).not.toContain('person@example.com');
    expect(JSON.stringify(loggerMock.warn.mock.calls)).not.toContain('Do not log this raw message');
  });

  it('identifies Resend testing mode recipient restrictions without logging the raw response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: jest.fn().mockResolvedValue({
        statusCode: 403,
        name: 'validation_error',
        message: 'You can only send testing emails to your own email address (owner@example.com). To send emails to other recipients, please verify a domain at resend.com/domains and change the from address.',
      }),
    } as unknown as Response);

    await expect(
      sendPasswordResetEmail({
        to: 'recipient@example.com',
        resetUrl: 'https://app.example.com/reset-password?token=never-log-this-token',
      }),
    ).resolves.toBe(false);

    expect(loggerMock.warn).toHaveBeenCalledWith('auth.password_reset.email_failed', {
      provider: 'resend',
      reasonCode: 'EMAIL_DELIVERY_FAILED',
      httpStatus: 403,
      providerCode: 'validation_error',
      providerMessage: 'The provider rejected the email request as invalid.',
      validationReason: 'Resend testing mode only permits delivery to the account owner email address.',
    });
    const logged = JSON.stringify(loggerMock.warn.mock.calls);
    expect(logged).not.toContain('owner@example.com');
    expect(logged).not.toContain('recipient@example.com');
    expect(logged).not.toContain('never-log-this-token');
    expect(logged).not.toContain('resend.com/domains');
  });

  it('logs a safe skipped reason when email configuration is missing', async () => {
    env.RESEND_API_KEY = undefined;

    await expect(
      sendPasswordResetEmail({ to: 'person@example.com', resetUrl: 'https://app.example.com/reset-password?token=never-log-this-token' }),
    ).resolves.toBe(false);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(loggerMock.warn).toHaveBeenCalledWith('auth.password_reset.email_skipped', {
      provider: 'resend',
      reasonCode: 'EMAIL_CONFIGURATION_MISSING',
    });
    expect(JSON.stringify(loggerMock.warn.mock.calls)).not.toContain('never-log-this-token');
    expect(JSON.stringify(loggerMock.warn.mock.calls)).not.toContain('person@example.com');
  });

  it('fails safely on network errors', async () => {
    fetchMock.mockRejectedValue(new Error('provider error with request details'));

    await expect(
      sendPasswordResetEmail({ to: 'person@example.com', resetUrl: 'https://app.example.com/reset-password' }),
    ).resolves.toBe(false);

    expect(loggerMock.warn).toHaveBeenCalledWith('auth.password_reset.email_failed', {
      provider: 'resend',
      reasonCode: 'EMAIL_DELIVERY_FAILED',
      httpStatus: null,
      providerCode: 'REQUEST_FAILED',
      providerMessage: 'The provider request failed before a response was received.',
    });
    expect(JSON.stringify(loggerMock.warn.mock.calls)).not.toContain('provider error with request details');
  });
});
