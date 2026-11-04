import fs from 'node:fs/promises';
import path from 'node:path';
import {
  assertPdfBuffer,
  readDocument,
  removeDocument,
  sanitizeFileName,
  storeDocument,
} from '../../src/services/document.service';
import { env } from '../../src/config/env';
import { buildTestPdf, NOT_A_PDF } from '../helpers/pdf';
import { ApiError } from '../../src/utils/ApiError';

const OWNER_ID = '507f1f77bcf86cd799439011';

afterAll(async () => {
  await fs.rm(env.uploadDirAbsolute, { recursive: true, force: true });
});

describe('assertPdfBuffer', () => {
  it('accepts a real PDF', () => {
    expect(() => assertPdfBuffer(buildTestPdf())).not.toThrow();
  });

  it('rejects a file whose content is not a PDF', () => {
    try {
      assertPdfBuffer(NOT_A_PDF);
      throw new Error('expected rejection');
    } catch (error) {
      expect((error as ApiError).code).toBe('INVALID_PDF_SIGNATURE');
    }
  });

  it('rejects an empty buffer', () => {
    expect(() => assertPdfBuffer(Buffer.alloc(0))).toThrow(ApiError);
  });
});

describe('sanitizeFileName', () => {
  it('strips directory components from a traversal attempt', () => {
    expect(sanitizeFileName('../../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('/absolute/path/deal.pdf')).toBe('deal.pdf');
  });

  it('removes shell and control characters', () => {
    expect(sanitizeFileName('rm -rf $(pwd);.pdf')).not.toMatch(/[$();]/);
  });

  it('falls back to a default name when nothing usable remains', () => {
    expect(sanitizeFileName('')).toBe('contract.pdf');
  });

  it('caps the length', () => {
    expect(sanitizeFileName(`${'a'.repeat(400)}.pdf`).length).toBeLessThanOrEqual(255);
  });
});

describe('document storage', () => {
  it('stores a PDF under an opaque key and reads it back byte-identically', async () => {
    const original = buildTestPdf();
    const stored = await storeDocument(OWNER_ID, original);

    expect(path.isAbsolute(stored.fileReference)).toBe(false);
    // The client filename must not influence the storage key.
    expect(stored.fileReference).toMatch(/^[a-f0-9]+\/[a-f0-9-]+\.pdf$/);
    expect(stored.checksum).toHaveLength(64);
    expect(stored.size).toBe(original.length);

    const roundTripped = await readDocument(stored.fileReference);
    expect(roundTripped.equals(original)).toBe(true);

    await removeDocument(stored.fileReference);
    await expect(readDocument(stored.fileReference)).rejects.toMatchObject({
      code: 'FILE_NOT_FOUND',
    });
  });

  it('refuses to store a non-PDF', async () => {
    await expect(storeDocument(OWNER_ID, NOT_A_PDF)).rejects.toBeInstanceOf(ApiError);
  });

  it('blocks path traversal in a file reference', async () => {
    await expect(readDocument('../../../etc/passwd')).rejects.toMatchObject({
      code: 'INVALID_FILE_REFERENCE',
    });
    await expect(readDocument('/etc/passwd')).rejects.toMatchObject({
      code: 'INVALID_FILE_REFERENCE',
    });
  });

  it('treats deleting a missing file as a no-op', async () => {
    await expect(removeDocument('deadbeef/does-not-exist.pdf')).resolves.toBeUndefined();
  });
});
