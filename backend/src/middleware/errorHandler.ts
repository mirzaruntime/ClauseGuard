import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import type { ErrorBody } from '../utils/apiResponse';

function normalize(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof ZodError) {
    return ApiError.validation(
      'Request validation failed',
      error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    );
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return ApiError.payloadTooLarge('Uploaded file exceeds the maximum allowed size', 'FILE_TOO_LARGE');
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return ApiError.badRequest('Unexpected file field in upload', 'UNEXPECTED_FILE_FIELD');
    }
    return ApiError.badRequest('File upload failed', 'UPLOAD_ERROR');
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return ApiError.validation(
      'Data validation failed',
      Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    );
  }

  if (error instanceof mongoose.Error.CastError) {
    return ApiError.badRequest('Invalid identifier provided', 'INVALID_ID');
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  ) {
    return ApiError.conflict('A record with these details already exists', 'DUPLICATE_KEY');
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return ApiError.badRequest('Malformed JSON payload', 'MALFORMED_JSON');
  }

  return ApiError.internal();
}

/** Centralised error middleware. Stack traces are never returned in production. */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const apiError = normalize(error);

  const logContext = {
    method: req.method,
    path: req.originalUrl,
    statusCode: apiError.statusCode,
    code: apiError.code,
    userId: req.user?.id,
    error: error instanceof Error ? error : new Error(String(error)),
  };

  if (apiError.statusCode >= 500) {
    logger.error('Unhandled request error', logContext);
  } else {
    logger.warn('Request failed', { ...logContext, error: undefined });
  }

  const body: ErrorBody = {
    success: false,
    message: apiError.statusCode >= 500 && env.isProduction ? 'Internal server error' : apiError.message,
    code: apiError.code,
  };

  if (apiError.details !== undefined) body.details = apiError.details;
  if (!env.isProduction && apiError.statusCode >= 500 && error instanceof Error) {
    (body as unknown as Record<string, unknown>).stack = error.stack;
  }

  res.status(apiError.statusCode).json(body);
}
