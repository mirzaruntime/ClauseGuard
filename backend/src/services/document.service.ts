import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import { PDF_MAGIC_BYTES } from '../config/constants';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export interface StoredDocument {
  /** Storage key relative to UPLOAD_DIR. Never an absolute path. */
  fileReference: string;
  checksum: string;
  size: number;
}

/**
 * Local filesystem document storage.
 *
 * The public surface (store / read / remove) is deliberately narrow so this
 * module can be swapped for S3 or another object store without touching
 * contract business logic.
 */

function assertSafeReference(fileReference: string): void {
  const normalized = path.normalize(fileReference);
  if (path.isAbsolute(normalized) || normalized.startsWith('..')) {
    throw ApiError.badRequest('Invalid file reference', 'INVALID_FILE_REFERENCE');
  }
}

function resolveAbsolutePath(fileReference: string): string {
  assertSafeReference(fileReference);
  const absolute = path.resolve(env.uploadDirAbsolute, fileReference);
  // Defence in depth against path traversal.
  if (!absolute.startsWith(path.resolve(env.uploadDirAbsolute) + path.sep)) {
    throw ApiError.badRequest('Invalid file reference', 'INVALID_FILE_REFERENCE');
  }
  return absolute;
}

export async function ensureUploadDirectory(): Promise<void> {
  await fs.mkdir(env.uploadDirAbsolute, { recursive: true });
}

/** Rejects anything that is not a real PDF, regardless of the declared MIME type. */
export function assertPdfBuffer(buffer: Buffer): void {
  if (!buffer || buffer.length === 0) {
    throw ApiError.badRequest('Uploaded file is empty', 'EMPTY_FILE');
  }
  if (!buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES)) {
    throw ApiError.unsupportedMediaType(
      'Uploaded file is not a valid PDF document',
      'INVALID_PDF_SIGNATURE',
    );
  }
}

/** Sanitises a client-supplied filename for display purposes only. */
export function sanitizeFileName(originalName: string): string {
  const base = path.basename(originalName || 'contract.pdf');
  const cleaned = base.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ').trim();
  return (cleaned || 'contract.pdf').slice(0, 255);
}

export async function storeDocument(ownerId: string, buffer: Buffer): Promise<StoredDocument> {
  assertPdfBuffer(buffer);
  await ensureUploadDirectory();

  const ownerDirectory = ownerId.replace(/[^a-f0-9]/gi, '');
  if (!ownerDirectory) {
    throw ApiError.badRequest('Invalid owner identifier', 'INVALID_ID');
  }

  const fileReference = path.posix.join(ownerDirectory, `${randomUUID()}.pdf`);
  const absolutePath = resolveAbsolutePath(fileReference);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer, { mode: 0o600 });

  return {
    fileReference,
    checksum: createHash('sha256').update(buffer).digest('hex'),
    size: buffer.length,
  };
}

export async function readDocument(fileReference: string): Promise<Buffer> {
  const absolutePath = resolveAbsolutePath(fileReference);
  try {
    return await fs.readFile(absolutePath);
  } catch {
    throw ApiError.notFound('Stored contract file could not be read', 'FILE_NOT_FOUND');
  }
}

/** Best-effort deletion; a missing file is not an error. */
export async function removeDocument(fileReference: string): Promise<void> {
  try {
    await fs.unlink(resolveAbsolutePath(fileReference));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      logger.warn('Failed to delete stored document', { code });
    }
  }
}
