import type { Request, Response } from 'express';
import * as obligationService from '../services/obligation.service';
import { requireUser } from '../middleware/auth';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AI_DISCLAIMER } from '../services/ai';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  const result = await obligationService.listObligations(user.id, req.query as never);
  sendSuccess(
    res,
    { obligations: result.items, disclaimer: AI_DISCLAIMER },
    undefined,
    200,
    result.pagination,
  );
});

export const stats = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  sendSuccess(res, { stats: await obligationService.getObligationStats(user.id) });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  const obligation = await obligationService.getObligationForOwner(user.id, req.params.id as string);
  sendSuccess(res, { obligation, disclaimer: AI_DISCLAIMER });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  const obligation = await obligationService.updateObligation(
    user.id,
    req.params.id as string,
    req.body,
  );
  sendSuccess(res, { obligation }, 'Obligation updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  await obligationService.deleteObligation(user.id, req.params.id as string);
  sendSuccess(res, null, 'Obligation deleted');
});
