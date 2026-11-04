import type { NextFunction, Request, Response } from 'express';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { extractBearerToken, verifyAccessToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuthenticatedRequest } from '../types';

/**
 * Verifies the bearer token and confirms the user still exists.
 * Any failure results in a generic 401 - no information about why is leaked.
 */
export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw ApiError.unauthorized('Authentication token is missing', 'MISSING_TOKEN');
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('_id email +tokenVersion').lean();
    if (!user) {
      throw ApiError.unauthorized('Authentication token is no longer valid', 'INVALID_TOKEN');
    }
    if (payload.tokenVersion !== (user.tokenVersion ?? 0)) {
      throw ApiError.unauthorized('Authentication token is no longer valid', 'INVALID_TOKEN');
    }

    req.user = { id: String(user._id), email: user.email };
    next();
  },
);

/** Narrows a request after `authenticate` has run. Throws if used out of order. */
export function requireUser(req: Request): AuthenticatedRequest {
  if (!req.user) {
    throw ApiError.unauthorized();
  }
  return req as AuthenticatedRequest;
}
