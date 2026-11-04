import { z } from 'zod';
import { REMINDER_CHANNELS, REMINDER_STATUSES } from '../models/Reminder';
import {
  idParamSchema,
  isoDateSchema,
  objectIdSchema,
  paginationSchema,
  sortOrderSchema,
} from './common.validator';

export const createReminderSchema = z.object({
  body: z.object({
    obligationId: objectIdSchema,
    reminderDate: isoDateSchema,
    channel: z.enum(REMINDER_CHANNELS as [string, ...string[]]).default('log'),
    message: z.string().trim().max(1000).optional(),
  }),
});

export const listRemindersSchema = z.object({
  query: paginationSchema.extend({
    status: z.enum(REMINDER_STATUSES as [string, ...string[]]).optional(),
    obligationId: objectIdSchema.optional(),
    sortBy: z.enum(['reminderDate', 'createdAt', 'status']).default('reminderDate'),
    sortOrder: sortOrderSchema,
  }),
});

export const reminderIdSchema = z.object({ params: idParamSchema });

export const updateReminderSchema = z.object({
  params: idParamSchema,
  body: z
    .object({
      reminderDate: isoDateSchema.optional(),
      message: z.string().trim().max(1000).nullable().optional(),
      status: z.enum(['scheduled', 'cancelled']).optional(),
      channel: z.enum(REMINDER_CHANNELS as [string, ...string[]]).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field must be provided',
    }),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>['body'];
export type ListRemindersQuery = z.infer<typeof listRemindersSchema>['query'];
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>['body'];
