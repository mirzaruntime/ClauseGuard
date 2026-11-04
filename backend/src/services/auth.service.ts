import mongoose from 'mongoose';
import { User, type SafeUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { hashPassword, verifyPassword } from '../utils/password';
import { signAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { createPasswordResetToken, hashPasswordResetToken } from '../utils/passwordResetToken';
import { sendPasswordResetEmail } from './email.service';
import { env } from '../config/env';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '../validators/auth.validator';

const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

export interface AuthResult {
  user: SafeUser;
  token: string;
  tokenType: 'Bearer';
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await User.exists({ email: input.email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists', 'EMAIL_ALREADY_REGISTERED');
  }

  const passwordHash = await hashPassword(input.password);

  let user;
  try {
    user = await User.create({ name: input.name, email: input.email, passwordHash });
  } catch (error) {
    // Handles the race between the exists() check and the unique index.
    if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
      throw ApiError.conflict('An account with this email already exists', 'EMAIL_ALREADY_REGISTERED');
    }
    throw error;
  }

  logger.info('user.registered', { userId: user.id });

  return {
    user: user.toSafeJSON(),
    token: signAccessToken({ sub: user.id, email: user.email, tokenVersion: user.tokenVersion ?? 0 }),
    tokenType: 'Bearer',
  };
}

/**
 * Login failures always return the same message and code so the endpoint
 * cannot be used to enumerate registered email addresses.
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash +tokenVersion');

  if (!user) {
    // Constant-ish work factor even when the user does not exist.
    await verifyPassword(input.password, '$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltinva');
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  logger.info('user.logged_in', { userId: user.id });

  return {
    user: user.toSafeJSON(),
    token: signAccessToken({ sub: user.id, email: user.email, tokenVersion: user.tokenVersion ?? 0 }),
    tokenType: 'Bearer',
  };
}

/** Stores only a digest and sends the raw token through the configured email provider. */
export async function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  const user = await User.findOne({ email: input.email });
  if (!user) {
    logger.info('auth.password_reset.email_skipped', { reasonCode: 'USER_NOT_FOUND' });
    return;
  }

  const token = createPasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  // Replacing these fields invalidates any earlier reset link for this account.
  await User.updateOne(
    { _id: user._id },
    { $set: { resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: expiresAt } },
  );

  const frontendUrl = env.FRONTEND_URL ?? (env.isDevelopment ? 'http://localhost:5173' : undefined);
  if (!frontendUrl) {
    logger.warn('auth.password_reset.email_skipped', { reasonCode: 'FRONTEND_URL_MISSING' });
    await User.updateOne(
      { _id: user._id, resetPasswordTokenHash: tokenHash },
      { $unset: { resetPasswordTokenHash: 1, resetPasswordExpiresAt: 1 } },
    );
    return;
  }

  const resetUrl = new URL('/reset-password', frontendUrl);
  resetUrl.searchParams.set('token', token);
  const delivered = await sendPasswordResetEmail({ to: user.email, resetUrl: resetUrl.toString() });

  if (!delivered) {
    logger.warn('auth.password_reset.email_skipped', { reasonCode: 'EMAIL_DELIVERY_FAILED' });
    // An undelivered link should not remain usable or block another request.
    await User.updateOne(
      { _id: user._id, resetPasswordTokenHash: tokenHash },
      { $unset: { resetPasswordTokenHash: 1, resetPasswordExpiresAt: 1 } },
    );
  }
}

/** Atomically consumes the token while changing the password and invalidating older JWTs. */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = hashPasswordResetToken(input.token);
  const passwordHash = await hashPassword(input.password);

  const updatedUser = await User.findOneAndUpdate(
    {
      resetPasswordTokenHash: tokenHash,
      // database.ts enables sanitizeFilter globally. Mark this server-owned
      // comparison as trusted so Mongoose preserves the atomic expiry check.
      resetPasswordExpiresAt: mongoose.trusted({ $gt: new Date() }),
    },
    {
      $set: { passwordHash },
      $unset: { resetPasswordTokenHash: 1, resetPasswordExpiresAt: 1 },
      $inc: { tokenVersion: 1 },
    },
    { new: true, runValidators: true },
  );

  if (!updatedUser) {
    throw ApiError.badRequest('This password reset link is invalid or has expired. Request a new one.', 'INVALID_RESET_TOKEN');
  }

  logger.info('auth.password_reset.completed', { userId: updatedUser.id });
}

export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
  return user.toSafeJSON();
}
