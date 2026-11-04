import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from './ApiError';
import type { JwtPayload } from '../types';

export function signAccessToken(payload: { sub: string; email: string; tokenVersion?: number }): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: 'clauseguard',
  };
  return jwt.sign({ email: payload.email, tokenVersion: payload.tokenVersion ?? 0 }, env.JWT_SECRET, {
    ...options,
    subject: payload.sub,
  });
}

/** Verifies a token, converting every jsonwebtoken failure into a safe 401. */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { issuer: 'clauseguard' });
    if (typeof decoded === 'string' || !decoded.sub || typeof decoded.sub !== 'string') {
      throw ApiError.unauthorized('Invalid authentication token', 'INVALID_TOKEN');
    }
    return {
      sub: decoded.sub,
      email: typeof decoded.email === 'string' ? decoded.email : '',
      // Accept tokens issued before token-version invalidation was introduced.
      tokenVersion:
        typeof decoded.tokenVersion === 'number' && Number.isInteger(decoded.tokenVersion)
          ? decoded.tokenVersion
          : 0,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Authentication token has expired', 'TOKEN_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid authentication token', 'INVALID_TOKEN');
  }
}

export function extractBearerToken(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim() || null;
}
