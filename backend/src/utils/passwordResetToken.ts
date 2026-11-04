import { createHash, randomBytes } from 'node:crypto';

/** Returns a high-entropy URL-safe token. The raw value is only sent by email. */
export function createPasswordResetToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Reset tokens are stored as a one-way digest, never as the emailed value. */
export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
