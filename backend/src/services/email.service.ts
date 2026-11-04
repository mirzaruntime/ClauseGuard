import { env } from '../config/env';
import { logger } from '../utils/logger';

const RESEND_API_URL = 'https://api.resend.com/emails';

const SAFE_PROVIDER_ERRORS: Record<string, string> = {
  daily_quota_exceeded: 'The provider daily sending quota was exceeded.',
  domain_not_verified: 'The sender domain is not verified with the provider.',
  invalid_api_key: 'The provider rejected the configured API key.',
  invalid_from_address: 'The configured sender address was rejected.',
  invalid_to_address: 'The recipient address was rejected.',
  missing_api_key: 'The provider API key was not supplied.',
  rate_limit_exceeded: 'The provider rate limit was exceeded.',
  restricted_api_key: 'The configured API key lacks permission for this request.',
  validation_error: 'The provider rejected the email request as invalid.',
};

const SAFE_PROVIDER_CODES = new Set(Object.keys(SAFE_PROVIDER_ERRORS));
const EMAIL_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSafeValidationReason(body: Record<string, unknown>): string | undefined {
  const message = typeof body.message === 'string' ? body.message : '';

  // Resend exposes this restriction in the message while keeping name=validation_error.
  // Match only the stable wording and emit a fixed, non-sensitive explanation.
  if (/you can only send testing emails to your own email address/i.test(message)) {
    return 'Resend testing mode only permits delivery to the account owner email address.';
  }

  return undefined;
}

function getSafeProviderError(body: unknown): {
  providerCode: string;
  providerMessage: string;
  validationReason?: string;
} {
  if (typeof body === 'object' && body !== null) {
    const providerBody = body as { name?: unknown; code?: unknown; message?: unknown };
    const candidate = typeof providerBody.name === 'string'
      ? providerBody.name
      : typeof providerBody.code === 'string'
        ? providerBody.code
        : '';
    const normalizedCode = candidate.toLowerCase();

    if (SAFE_PROVIDER_CODES.has(normalizedCode)) {
      return {
        providerCode: normalizedCode,
        providerMessage: SAFE_PROVIDER_ERRORS[normalizedCode],
        ...(normalizedCode === 'validation_error'
          ? { validationReason: getSafeValidationReason(providerBody) }
          : {}),
      };
    }
  }

  return {
    providerCode: 'UNRECOGNIZED_PROVIDER_ERROR',
    providerMessage: 'The provider returned an unrecognized error.',
  };
}

async function readProviderError(response: Response): Promise<{
  providerCode: string;
  providerMessage: string;
  validationReason?: string;
}> {
  try {
    return getSafeProviderError(await response.json());
  } catch {
    return {
      providerCode: 'UNRECOGNIZED_PROVIDER_ERROR',
      providerMessage: 'The provider returned an unrecognized error.',
    };
  }
}

async function readEmailId(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null || !('id' in body)) return null;
    const { id } = body as { id?: unknown };
    return typeof id === 'string' && EMAIL_ID_PATTERN.test(id) ? id : null;
  } catch {
    return null;
  }
}

export interface PasswordResetEmail {
  to: string;
  resetUrl: string;
}

export interface ReminderEmail {
  to: string;
  obligationTitle: string;
  message: string | null;
  contractTitle: string | null;
  deadline: Date | null;
  reminderDate: Date | null;
  reminderUrl: string | null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] as string);
}

function formatReminderDate(value: Date | null): string | null {
  return value && Number.isFinite(value.getTime()) ? value.toISOString() : null;
}

/** Sends a reminder through the same Resend endpoint and configuration as recovery email. */
export async function sendReminderEmail(input: ReminderEmail): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error('EMAIL_CONFIGURATION_MISSING');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to.trim())) throw new Error('REMINDER_RECIPIENT_INVALID');

  const title = input.obligationTitle.trim() || 'Contract obligation';
  const message = input.message?.trim() || null;
  const contractTitle = input.contractTitle?.trim() || null;
  const reminderDate = formatReminderDate(input.reminderDate);
  const deadline = formatReminderDate(input.deadline);
  const text = [
    `Obligation: ${title}`,
    ...(contractTitle ? [`Contract: ${contractTitle}`] : []),
    ...(reminderDate ? [`Reminder time: ${reminderDate}`] : []),
    ...(deadline ? [`Deadline: ${deadline}`] : []),
    ...(message ? ['', `Note: ${message}`] : []),
  ];
  const html = [
    `<p><strong>Obligation:</strong> ${escapeHtml(title)}</p>`,
    ...(contractTitle ? [`<p><strong>Contract:</strong> ${escapeHtml(contractTitle)}</p>`] : []),
    ...(reminderDate ? [`<p><strong>Reminder time:</strong> ${escapeHtml(reminderDate)}</p>`] : []),
    ...(deadline ? [`<p><strong>Deadline:</strong> ${escapeHtml(deadline)}</p>`] : []),
    ...(message ? [`<p><strong>Note:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`] : []),
  ].join('\n');
  const safeLink = input.reminderUrl?.toLowerCase().startsWith('https://') ? input.reminderUrl : null;

  let response: Response;
  try {
    response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [input.to.trim()],
        subject: `ClauseGuard reminder: ${title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#092634"><h1>ClauseGuard reminder</h1>${html}${safeLink ? `<p><a href="${escapeHtml(safeLink)}">View contract in ClauseGuard</a></p>` : ''}</div>`,
        text: [...text, ...(safeLink ? ['', `View contract in ClauseGuard: ${safeLink}`] : [])].join('\n'),
      }),
    });
  } catch (error) {
    throw new Error(error instanceof Error && error.name === 'TimeoutError' ? 'EMAIL_PROVIDER_TIMEOUT' : 'EMAIL_PROVIDER_NETWORK_FAILURE');
  }

  if (!response.ok) {
    const providerError = await readProviderError(response);
    logger.warn('reminder.email_rejected', {
      provider: 'resend', httpStatus: response.status,
      providerCode: providerError.providerCode, providerMessage: providerError.providerMessage,
    });
    throw new Error(`EMAIL_PROVIDER_REJECTED:${providerError.providerCode}`);
  }
  logger.info('reminder.email_accepted', { provider: 'resend', httpStatus: response.status });
}

/** Sends a password reset email without logging recipient addresses or tokens. */
export async function sendPasswordResetEmail({ to, resetUrl }: PasswordResetEmail): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    logger.warn('auth.password_reset.email_skipped', {
      provider: 'resend',
      reasonCode: 'EMAIL_CONFIGURATION_MISSING',
    });
    return false;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [to],
        subject: 'Reset your ClauseGuard password',
        html: `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 24px auto; color: #092634;">
          <div style="background: #092634; padding: 24px; border-radius: 12px 12px 0 0; color: #F9F9F9;">
            <h1 style="margin: 0; font-size: 21px;">ClauseGuard</h1>
            <p style="margin: 6px 0 0; color: #d6e0e5;">Password recovery</p>
          </div>
          <div style="padding: 28px; border: 1px solid #dce4e8; border-top: 0; border-radius: 0 0 12px 12px;">
            <h2 style="margin-top: 0;">Reset your password</h2>
            <p>We received a request to reset the password for your ClauseGuard account. Use the secure link below to choose a new password.</p>
            <p style="margin: 28px 0;"><a href="${resetUrl}" style="display: inline-block; background: #FF6E42; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset password</a></p>
            <p>This link expires in 15 minutes and can only be used once.</p>
            <p>If you did not request this change, you can ignore this email. Your password will remain unchanged.</p>
          </div>
        </div>`,
        text: [
        'ClauseGuard password reset',
        '',
        'We received a request to reset the password for your ClauseGuard account.',
        `Reset your password: ${resetUrl}`,
        '',
        'This link expires in 15 minutes and can only be used once.',
        'If you did not request this change, ignore this email. Your password will remain unchanged.',
        ].join('\n'),
      }),
    });

    if (!response.ok) {
      const providerError = await readProviderError(response);
      logger.warn('auth.password_reset.email_failed', {
        provider: 'resend',
        reasonCode: 'EMAIL_DELIVERY_FAILED',
        httpStatus: response.status,
        ...providerError,
      });
      return false;
    }

    logger.info('auth.password_reset.email_sent', {
      provider: 'resend',
      httpStatus: response.status,
      emailId: await readEmailId(response),
    });
    return true;
  } catch (error) {
    // Exception messages can contain request details, so use only the error class.
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    logger.warn('auth.password_reset.email_failed', {
      provider: 'resend',
      reasonCode: 'EMAIL_DELIVERY_FAILED',
      httpStatus: null,
      providerCode: timedOut ? 'REQUEST_TIMEOUT' : 'REQUEST_FAILED',
      providerMessage: timedOut ? 'The provider request timed out.' : 'The provider request failed before a response was received.',
    });
    return false;
  }
}
