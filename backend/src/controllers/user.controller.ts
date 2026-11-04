import type { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { requireUser } from '../middleware/auth';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  const profile = await userService.updateProfile(user.id, req.body);
  sendSuccess(res, { user: profile }, 'Profile updated');
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  await userService.changePassword(user.id, req.body);
  sendSuccess(res, null, 'Password updated');
});
