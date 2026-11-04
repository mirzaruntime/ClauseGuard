import { createPasswordResetToken, hashPasswordResetToken } from '../../src/utils/passwordResetToken';
import { passwordSchema, resetPasswordSchema } from '../../src/validators/auth.validator';

describe('password reset tokens', () => {
  it('generates URL-safe tokens with 256 bits of entropy', () => {
    const first = createPasswordResetToken();
    const second = createPasswordResetToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
  });

  it('hashes consistently without returning the raw token', () => {
    const token = createPasswordResetToken();
    const digest = hashPasswordResetToken(token);

    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toBe(token);
    expect(hashPasswordResetToken(token)).toBe(digest);
  });
});

describe('reset password validation', () => {
  it('reuses the registration password policy', () => {
    for (const password of ['short', 'alllowercase123', 'ALLUPPERCASE123', 'NoDigitsHere']) {
      expect(passwordSchema.safeParse(password).success).toBe(false);
      expect(resetPasswordSchema.safeParse({ body: { token: 'a'.repeat(43), password } }).success).toBe(false);
    }

    expect(passwordSchema.safeParse('NewSecurePass456').success).toBe(true);
  });

  it('rejects malformed reset token values before database access', () => {
    expect(resetPasswordSchema.safeParse({ body: { token: 'short', password: 'NewSecurePass456' } }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ body: { token: 'a'.repeat(43), password: 'NewSecurePass456' } }).success).toBe(true);
  });
});
