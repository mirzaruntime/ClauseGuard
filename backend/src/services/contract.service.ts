import { Types, type FilterQuery } from 'mongoose';
import { Contract, type ContractDocument, type IContract } from '../models/Contract';
import { Obligation } from '../models/Obligation';
import { Reminder } from '../models/Reminder';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { buildPagination } from '../utils/apiResponse';
import { toObjectId } from '../utils/objectId';
import type { PaginatedResult } from '../types';
import type { ListContractsQuery } from '../validators/contract.validator';
import { removeDocument, sanitizeFileName, storeDocument } from './document.service';
import { enqueueContractProcessing } from './processing.service';

export interface UploadContractInput {
  ownerId: string;
  title?: string;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

/** Derives a human title from the filename when the client did not supply one. */
function deriveTitle(providedTitle: string | undefined, fileName: string): string {
  if (providedTitle?.trim()) return providedTitle.trim().slice(0, 200);
  return fileName.replace(/\.pdf$/i, '').trim().slice(0, 200) || 'Untitled contract';
}

export async function uploadContract(input: UploadContractInput): Promise<ContractDocument> {
  const originalFileName = sanitizeFileName(input.originalName);
  const stored = await storeDocument(input.ownerId, input.buffer);

  let contract: ContractDocument;
  try {
    contract = await Contract.create({
      ownerId: toObjectId(input.ownerId, 'user'),
      title: deriveTitle(input.title, originalFileName),
      originalFileName,
      fileReference: stored.fileReference,
      mimeType: input.mimeType,
      fileSize: stored.size,
      checksum: stored.checksum,
      status: 'uploaded',
    });
  } catch (error) {
    // Never leave an orphaned file behind if the database write fails.
    await removeDocument(stored.fileReference);
    throw error;
  }

  logger.info('contract.uploaded', {
    contractId: contract.id,
    ownerId: input.ownerId,
    fileSize: stored.size,
  });

  enqueueContractProcessing(contract.id);

  return contract;
}

export async function listContracts(
  ownerId: string,
  query: ListContractsQuery,
): Promise<PaginatedResult<ContractDocument>> {
  const filter: FilterQuery<IContract> = { ownerId: toObjectId(ownerId, 'user') };
  if (query.status) filter.status = query.status;
  if (query.search) {
    // Escaped so user input cannot be used as a regular expression.
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = { $regex: escaped, $options: 'i' };
  }

  const sort: Record<string, 1 | -1> = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Contract.find(filter).sort(sort).skip(skip).limit(query.limit),
    Contract.countDocuments(filter),
  ]);

  return { items, pagination: buildPagination(query.page, query.limit, total) };
}

/** Every read is scoped by ownerId; a non-owner gets a 404, not a 403. */
export async function getContractForOwner(
  ownerId: string,
  contractId: string,
): Promise<ContractDocument> {
  const contract = await Contract.findOne({
    _id: toObjectId(contractId, 'contract'),
    ownerId: toObjectId(ownerId, 'user'),
  });

  if (!contract) throw ApiError.notFound('Contract not found', 'CONTRACT_NOT_FOUND');
  return contract;
}

export async function getContractDetails(ownerId: string, contractId: string) {
  const contract = await getContractForOwner(ownerId, contractId);

  const obligationCounts = await Obligation.aggregate<{ _id: string; count: number }>([
    { $match: { contractId: new Types.ObjectId(contract.id as string) } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  return {
    contract,
    obligationSummary: obligationCounts.reduce<Record<string, number>>((acc, entry) => {
      acc[entry._id] = entry.count;
      return acc;
    }, {}),
  };
}

/** Deletes the contract, its obligations, their reminders and the stored file. */
export async function deleteContract(ownerId: string, contractId: string): Promise<void> {
  const contract = await getContractForOwner(ownerId, contractId);
  const contractObjectId = new Types.ObjectId(contract.id as string);

  await Reminder.deleteMany({ contractId: contractObjectId, ownerId: contract.ownerId });
  await Obligation.deleteMany({ contractId: contractObjectId, ownerId: contract.ownerId });
  await Contract.deleteOne({ _id: contractObjectId, ownerId: contract.ownerId });
  await removeDocument(contract.fileReference);

  logger.info('contract.deleted', { contractId: contract.id, ownerId });
}
