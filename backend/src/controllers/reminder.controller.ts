import type { Request, Response } from 'express';
import * as reminderService from '../services/reminder.service';
import { requireUser } from '../middleware/auth';
import { sendCreated, sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  const reminder = await reminderService.createReminder(user.id, req.body);
  sendCreated(res, { reminder }, 'Reminder scheduled');
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  const result = await reminderService.listReminders(user.id, req.query as never);
  sendSuccess(res, { reminders: result.items }, undefined, 200, result.pagination);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  const reminder = await reminderService.getReminderForOwner(user.id, req.params.id as string);
  sendSuccess(res, { reminder });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  const reminder = await reminderService.updateReminder(
    user.id,
    req.params.id as string,
    req.body,
  );
  sendSuccess(res, { reminder }, 'Reminder updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  const reminder = await reminderService.cancelReminder(user.id, req.params.id as string);
  sendSuccess(
    res,
    { reminder },
    reminder ? 'Reminder cancelled' : 'Reminder deleted',
  );
});
