import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env';
import type { ErrorBody } from '../utils/apiResponse';

const body: ErrorBody = {
  success: false,
  message: 'Too many requests. Please try again later.',
  code: 'RATE_LIMITED',
};

const shared: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: body,
  // Rate limiting is disabled under test so suites remain deterministic.
  skip: () => env.isTest,
};

export const globalRateLimiter = rateLimit({
  ...shared,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/** Stricter bucket for credential endpoints to slow down brute-force attempts. */
export const authRateLimiter = rateLimit({
  ...shared,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
});

/** Separate, stricter bucket for password recovery to limit email abuse. */
export const passwordResetRateLimiter = rateLimit({
  ...shared,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: Math.min(env.AUTH_RATE_LIMIT_MAX, 5),
});

export const uploadRateLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60_000,
  limit: 60,
});
