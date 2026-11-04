import { env } from '../../src/config/env';
import { logger } from '../../src/utils/logger';
import { sendReminderEmail } from '../../src/services/email.service';

jest.mock('../../src/utils/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

describe('reminder email delivery through Resend', () => {
  let fetchMock: jest.SpyInstance<ReturnType<typeof fetch>, Parameters<typeof fetch>>;
  const input = {
    to: 'owner@example.com', obligationTitle: 'Renewal <notice>',
    message: '<script>alert("x")</script> & check', contractTitle: 'Main agreement',
    deadline: new Date('2027-02-01T12:00:00.000Z'),
    reminderDate: new Date('2027-01-31T12:00:00.000Z'),
    reminderUrl: 'https://app.example.com/contracts/abc',
  };

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockReset();
    env.RESEND_API_KEY = 'test-resend-key';
    env.EMAIL_FROM = 'ClauseGuard <notifications@example.com>';
    jest.mocked(logger.info).mockClear();
    jest.mocked(logger.warn).mockClear();
  });

  afterAll(() => fetchMock.mockRestore());

  it('sends readable HTML and text, escaping user supplied content', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);
    await expect(sendReminderEmail(input)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer test-resend-key' }),
    }));
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { html: string; text: string };
    expect(body.html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; check');
    expect(body.html).not.toContain('<script>');
    expect(body.text).toContain('<script>alert("x")</script> & check');
    expect(body.html).toContain('Main agreement');
    expect(body.text).toContain('Deadline: 2027-02-01T12:00:00.000Z');
  });

  it('treats provider rejection as a failed delivery without logging recipient or raw body', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ name: 'validation_error', message: 'private provider details owner@example.com' }) } as unknown as Response);
    await expect(sendReminderEmail(input)).rejects.toThrow('EMAIL_PROVIDER_REJECTED:validation_error');
    expect(JSON.stringify(jest.mocked(logger.warn).mock.calls)).not.toContain('owner@example.com');
    expect(JSON.stringify(jest.mocked(logger.warn).mock.calls)).not.toContain('private provider details');
  });

  it('treats network errors as failed delivery without exposing exception text', async () => {
    fetchMock.mockRejectedValue(new Error('network error containing recipient owner@example.com'));
    await expect(sendReminderEmail(input)).rejects.toThrow('EMAIL_PROVIDER_NETWORK_FAILURE');
  });

  it('reports missing email configuration safely', async () => {
    env.RESEND_API_KEY = undefined;
    await expect(sendReminderEmail(input)).rejects.toThrow('EMAIL_CONFIGURATION_MISSING');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid recipient before contacting Resend', async () => {
    await expect(sendReminderEmail({ ...input, to: 'not-an-email' })).rejects.toThrow('REMINDER_RECIPIENT_INVALID');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
