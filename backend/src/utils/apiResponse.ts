import type { Response } from 'express';
import type { Pagination } from '../types';
import { MAX_PAGE_LIMIT } from '../config/constants';

export interface SuccessBody<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: Pagination;
}

export interface ErrorBody {
  success: false;
  message: string;
  code?: string;
  details?: unknown;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  pagination?: Pagination,
): Response {
  const body: SuccessBody<T> = { success: true, data };
  if (message) body.message = message;
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T, message?: string): Response {
  return sendSuccess(res, data, message, 201);
}

export function buildPagination(page: number, limit: number, total: number): Pagination {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_PAGE_LIMIT);
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);
  return {
    page,
    limit: safeLimit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}
