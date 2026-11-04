import { z } from 'zod';
import { OBLIGATION_STATUSES } from '../models/Obligation';
import {
  idParamSchema,
  isoDateSchema,
  objectIdSchema,
  paginationSchema,
  sortOrderSchema,
} from './common.validator';

export const listObligationsSchema = z.object({
  query: paginationSchema.extend({
    status: z.enum(OBLIGATION_STATUSES as [string, ...string[]]).optional(),
    contractId: objectIdSchema.optional(),
    dueBefore: isoDateSchema.optional(),
    dueAfter: isoDateSchema.optional(),
    search: z.string().trim().min(1).max(120).optional(),
    sortBy: z.enum(['deadline', 'createdAt', 'confidence', 'status']).default('deadline'),
    sortOrder: sortOrderSchema,
  }),
});

export const obligationIdSchema = z.object({ params: idParamSchema });

/**
 * A single PATCH endpoint handles both content edits and review decisions.
 * Status changes are validated against the explicit transition map in the service.
 */
export const updateObligationSchema = z.object({
  params: idParamSchema,
  body: z
    .object({
      title: z.string().trim().min(1).max(250).optional(),
      description: z.string().trim().min(1).max(5000).optional(),
      status: z.enum(OBLIGATION_STATUSES as [string, ...string[]]).optional(),
      deadline: isoDateSchema.nullable().optional(),
      noticePeriod: z.string().trim().max(250).nullable().optional(),
      conditions: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field must be provided',
    }),
});

export type ListObligationsQuery = z.infer<typeof listObligationsSchema>['query'];
export type UpdateObligationInput = z.infer<typeof updateObligationSchema>['body'];
