import { z } from 'zod';
import { CONTRACT_STATUSES } from '../models/Contract';
import { idParamSchema, paginationSchema, sortOrderSchema } from './common.validator';

export const uploadContractSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
  }),
});

export const listContractsSchema = z.object({
  query: paginationSchema.extend({
    status: z.enum(CONTRACT_STATUSES as [string, ...string[]]).optional(),
    search: z.string().trim().min(1).max(120).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'status']).default('createdAt'),
    sortOrder: sortOrderSchema,
  }),
});

export const contractIdSchema = z.object({ params: idParamSchema });

export type ListContractsQuery = z.infer<typeof listContractsSchema>['query'];
