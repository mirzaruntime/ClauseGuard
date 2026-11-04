import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { normalizeText, truncateForAi } from '../../src/services/pdf.service';
import { buildTestPdf, CORRUPT_PDF, NOT_A_PDF } from '../helpers/pdf';

interface PdfRunnerResult {
  ok: boolean;
  result?: {
    text: string;
    pageCount: number;
    characterCount: number;
    truncated: boolean;
  };
  error?: { name: string; code?: string; message?: string };
}

function extractPdfTextOutsideJest(buffer: Buffer): PdfRunnerResult {
  const runnerPath = path.join(__dirname, '../helpers/pdf-extraction-runner.cjs');
  const child = spawnSync(process.execPath, ['-r', 'tsx/cjs', runnerPath], {
    input: buffer.toString('base64'),
    encoding: 'utf8',
    timeout: 15_000,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/clauseguard-test',
      JWT_SECRET: 'test-only-secret-value-that-is-long-enough-1234567890',
      BCRYPT_SALT_ROUNDS: '8',
      UPLOAD_DIR: 'tmp-test-uploads',
      LOG_LEVEL: 'silent',
      SCHEDULER_ENABLED: 'false',
      CORS_ORIGIN: '*',
    },
  });

  if (child.error) throw child.error;
  const outputLine = child.stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith('PDF_RESULT:'));
  if (child.status !== 0 || !outputLine) {
    throw new Error(`PDF extraction runner failed: ${child.stderr || child.stdout}`);
  }
  const result = JSON.parse(outputLine.slice('PDF_RESULT:'.length)) as PdfRunnerResult;
  return result;
}

describe('normalizeText', () => {
  it('collapses repeated whitespace and blank lines', () => {
    expect(normalizeText('a   b\n\n\n\nc')).toBe('a b\n\nc');
  });

  it('rejoins words hyphenated across a line break', () => {
    expect(normalizeText('obli-\ngation')).toBe('obligation');
  });

  it('normalises smart quotes and dashes', () => {
    expect(normalizeText('\u201cterm\u201d \u2013 \u2018x\u2019')).toBe('"term" - \'x\'');
  });
});

describe('truncateForAi', () => {
  it('leaves short text untouched', () => {
    const result = truncateForAi('short text', 100);
    expect(result.truncated).toBe(false);
    expect(result.text).toBe('short text');
  });

  it('truncates long text and flags it', () => {
    const result = truncateForAi('x'.repeat(500), 100);
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(100);
  });

  it('prefers a paragraph boundary when one is available', () => {
    const text = `${'a'.repeat(80)}\n\n${'b'.repeat(80)}`;
    const result = truncateForAi(text, 100);
    expect(result.truncated).toBe(true);
    expect(result.text.endsWith('a')).toBe(true);
  });
});

describe('extractPdfText', () => {
  it('rejects a file that is not a PDF', async () => {
    const result = extractPdfTextOutsideJest(NOT_A_PDF);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('PDF_EXTRACTION_FAILED');
  });

  it('rejects a PDF with a valid header but a corrupt body', async () => {
    const result = extractPdfTextOutsideJest(CORRUPT_PDF);
    expect(result.ok).toBe(false);
    expect(result.error?.name).toBe('ApiError');
    expect(result.error?.code).toBe('PDF_EXTRACTION_FAILED');
  });

  it('rejects an empty buffer', async () => {
    const result = extractPdfTextOutsideJest(Buffer.alloc(0));
    expect(result.ok).toBe(false);
    expect(result.error?.name).toBe('ApiError');
    expect(result.error?.code).toBe('EMPTY_FILE');
  });

  it('extracts text from a PDF that has a real text layer', async () => {
    const response = extractPdfTextOutsideJest(buildTestPdf());
    if (!response.ok) throw new Error(JSON.stringify(response));
    expect(response.ok).toBe(true);
    expect(response.result?.text).toContain('Supplier');
    expect(response.result?.pageCount).toBe(1);
    expect(response.result?.truncated).toBe(false);
    expect(response.result?.characterCount).toBeGreaterThan(200);
  });

  it('flags truncation for documents beyond the AI input limit', async () => {
    const original = process.env.AI_MAX_INPUT_CHARS;
    try {
      const { truncateForAi } = await import('../../src/services/pdf.service');
      const long = 'clause text. '.repeat(1000);
      expect(truncateForAi(long, 500).truncated).toBe(true);
    } finally {
      process.env.AI_MAX_INPUT_CHARS = original;
    }
  });
});
