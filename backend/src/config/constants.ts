import type { ObligationStatus } from '../types';

export const API_BASE_PATH = '/api';

export const ALLOWED_UPLOAD_MIME_TYPES = ['application/pdf'] as const;
export const ALLOWED_UPLOAD_EXTENSIONS = ['.pdf'] as const;

/** PDF magic number: %PDF */
export const PDF_MAGIC_BYTES = Buffer.from('%PDF', 'ascii');

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

/** Minimum number of extracted characters for a PDF to be considered readable. */
export const MIN_EXTRACTED_TEXT_CHARS = 200;

/**
 * Explicit obligation state machine. AI output always enters as `potential`
 * and only a human action can move it forward.
 */
export const OBLIGATION_STATUS_TRANSITIONS: Record<
  ObligationStatus,
  ObligationStatus[]
> = {
  potential: ['confirmed', 'rejected'],
  confirmed: ['completed', 'rejected', 'overdue'],
  overdue: ['completed', 'rejected', 'confirmed'],
  rejected: ['potential'],
  completed: ['confirmed'],
};
