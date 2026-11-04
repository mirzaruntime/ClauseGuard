import { z } from 'zod';
import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../config/constants';
import { isValidObjectId } from '../utils/objectId';

export const objectIdSchema = z
  .string()
  .refine((value) => isValidObjectId(value), { message: 'Must be a valid identifier' });

export const idParamSchema = z.object({ id: objectIdSchema });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

/** Accepts ISO-8601 strings only; everything is normalised to a UTC Date. */
export const isoDateSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be an ISO date (YYYY-MM-DD)'))
  .transform((value) => new Date(value))
  .refine((date) => !Number.isNaN(date.getTime()), { message: 'Invalid date' });
