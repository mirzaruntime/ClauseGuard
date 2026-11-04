import { Types } from 'mongoose';
import { ApiError } from './ApiError';

export function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value) && String(new Types.ObjectId(value)) === value;
}

export function toObjectId(value: string, resourceName = 'resource'): Types.ObjectId {
  if (!isValidObjectId(value)) {
    throw ApiError.badRequest(`Invalid ${resourceName} identifier`, 'INVALID_ID');
  }
  return new Types.ObjectId(value);
}
