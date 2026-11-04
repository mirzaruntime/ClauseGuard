import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { MIN_EXTRACTED_TEXT_CHARS } from '../config/constants';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

/**
 * pdf.js is loaded through its ESM legacy build, which supports Node extraction.
 * Node 22.13+ can synchronously require ESM modules without a VM import hook;
 * loading remains deferred so callers that never touch PDFs do not load it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfJsModule = any;
let pdfjsModule: PdfJsModule | null = null;
const nativeRequire = createRequire(__filename);

function pdfJsEntry(): string {
  return nativeRequire.resolve('pdfjs-dist/legacy/build/pdf.mjs');
}

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsModule) {
    const entry = pdfJsEntry();
    pdfjsModule = nativeRequire(entry);
  }
  return pdfjsModule;
}

/** Bundled font metrics, so extraction never reaches out to the network. */
function standardFontDataUrl(): string {
  const standardFontPath = `${path.resolve(
    path.dirname(pdfJsEntry()),
    '../../standard_fonts',
  )}${path.sep}`;
  return pathToFileURL(standardFontPath).href;
}

export interface ExtractedDocument {
  text: string;
  pageCount: number;
  characterCount: number;
  truncated: boolean;
}

/**
 * Collapses PDF extraction artefacts (hard-wrapped lines, ligatures, repeated
 * whitespace) into text an LLM can reason about reliably.
 */
export function normalizeText(rawText: string): string {
  return rawText
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    // Re-join words split across a line break by hyphenation.
    .replace(/(\w)-\n(\w)/g, '$1$2')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Truncates on a paragraph boundary so a clause is not cut mid-sentence. */
export function truncateForAi(
  text: string,
  maxChars: number = env.AI_MAX_INPUT_CHARS,
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  const slice = text.slice(0, maxChars);
  const boundary = slice.lastIndexOf('\n\n');
  return {
    text: boundary > maxChars * 0.6 ? slice.slice(0, boundary) : slice,
    truncated: true,
  };
}

function translatePdfError(error: unknown): ApiError {
  const name = (error as { name?: string })?.name ?? '';
  const message = error instanceof Error ? error.message : String(error);

  if (name === 'PasswordException') {
    return ApiError.badRequest(
      'This PDF is password protected and cannot be analysed.',
      'PDF_PASSWORD_PROTECTED',
    );
  }

  logger.warn('PDF parsing failed', { reason: message.slice(0, 200), name });

  return ApiError.badRequest(
    'The PDF could not be read. It may be corrupt or in an unsupported format.',
    'PDF_EXTRACTION_FAILED',
  );
}

/**
 * Extracts and normalises text from a PDF buffer.
 *
 * Pages are read sequentially and released as we go, so a large document does
 * not hold every page's render state in memory at once. Encrypted,
 * scanned/image-only and corrupt PDFs surface as operational errors.
 */
export async function extractPdfText(buffer: Buffer): Promise<ExtractedDocument> {
  if (!buffer || buffer.length === 0) {
    throw ApiError.badRequest('Uploaded file is empty', 'EMPTY_FILE');
  }

  const pdfjs = await loadPdfJs();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let document: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let loadingTask: any = null;

  try {
    loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      standardFontDataUrl: standardFontDataUrl(),
      // Hardening: no eval, no external font/image fetches, no XFA forms.
      isEvalSupported: false,
      useSystemFonts: false,
      disableFontFace: true,
      enableXfa: false,
    });
    document = await loadingTask.promise;
  } catch (error) {
    await loadingTask?.destroy().catch(() => undefined);
    throw translatePdfError(error);
  }

  const pageCount: number = document.numPages ?? 0;
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        let pageText = '';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const item of content.items as any[]) {
          if (typeof item?.str !== 'string') continue;
          pageText += item.str;
          pageText += item.hasEOL ? '\n' : ' ';
        }
        pages.push(pageText);
      } finally {
        page.cleanup();
      }
    }
  } catch (error) {
    throw translatePdfError(error);
  } finally {
    await document.cleanup().catch(() => undefined);
    await loadingTask.destroy().catch(() => undefined);
  }

  const text = normalizeText(pages.join('\n\n'));

  if (text.length < MIN_EXTRACTED_TEXT_CHARS) {
    throw ApiError.badRequest(
      'No readable text could be extracted. Scanned or image-only PDFs require OCR, which is not supported.',
      'PDF_NO_TEXT_LAYER',
    );
  }

  const { text: prepared, truncated } = truncateForAi(text);

  return {
    text: prepared,
    pageCount,
    characterCount: text.length,
    truncated,
  };
}
