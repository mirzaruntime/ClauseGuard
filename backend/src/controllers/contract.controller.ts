import type { Request, Response } from 'express';
import * as contractService from '../services/contract.service';
import { requireUser } from '../middleware/auth';
import { ApiError } from '../utils/ApiError';
import { sendCreated, sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AI_DISCLAIMER } from '../services/ai';

export const upload = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);

  if (!req.file) {
    throw ApiError.badRequest('A PDF file is required', 'FILE_REQUIRED');
  }

  const contract = await contractService.uploadContract({
    ownerId: user.id,
    title: typeof req.body?.title === 'string' ? req.body.title : undefined,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    buffer: req.file.buffer,
  });

  sendCreated(
    res,
    { contract, disclaimer: AI_DISCLAIMER },
    'Contract uploaded. Analysis has been queued.',
  );
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  const result = await contractService.listContracts(user.id, req.query as never);
  sendSuccess(res, { contracts: result.items }, undefined, 200, result.pagination);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  const details = await contractService.getContractDetails(user.id, req.params.id as string);
  sendSuccess(res, { ...details, disclaimer: AI_DISCLAIMER });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { user } = requireUser(req);
  await contractService.deleteContract(user.id, req.params.id as string);
  sendSuccess(res, null, 'Contract deleted');
});
