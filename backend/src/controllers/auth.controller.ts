import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { requireUser } from '../middleware/auth';
import { sendCreated, sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  sendCreated(res, result, 'Account created successfully');
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  sendSuccess(res, result, 'Signed in successfully');
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.requestPasswordReset(req.body);
  sendSuccess(
    res,
    null,
    'If an account exists with this email address and email delivery is available, a password reset link will be sent shortly.',
    202,
  );
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body);
  sendSuccess(res, null, 'Password updated successfully. Please sign in with your new password.');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  const profile = await authService.getCurrentUser(user.id);
  sendSuccess(res, { user: profile });
});
