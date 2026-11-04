import path from 'node:path';
import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { env } from '../config/env';
import { ALLOWED_UPLOAD_EXTENSIONS, ALLOWED_UPLOAD_MIME_TYPES } from '../config/constants';
import { ApiError } from '../utils/ApiError';

export const UPLOAD_FIELD_NAME = 'file';

/**
 * Files are buffered in memory so their content can be verified (magic bytes,
 * checksum) BEFORE anything is written to disk. Declared MIME type and filename
 * come from the client and are treated as untrusted hints only.
 */
function fileFilter(_req: Request, file: Express.Multer.File, callback: FileFilterCallback): void {
  const extension = path.extname(file.originalname || '').toLowerCase();

  if (!(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
    callback(ApiError.unsupportedMediaType('Only PDF files are accepted', 'UNSUPPORTED_FILE_TYPE'));
    return;
  }

  if (!(ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(extension)) {
    callback(ApiError.unsupportedMediaType('Only .pdf files are accepted', 'UNSUPPORTED_FILE_EXTENSION'));
    return;
  }

  callback(null, true);
}

export const uploadContractFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: 1,
    fields: 10,
  },
  fileFilter,
}).single(UPLOAD_FIELD_NAME);
