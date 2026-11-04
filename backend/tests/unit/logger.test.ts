/**
 * The log level is read from validated config at import time, so each case
 * re-imports the logger in an isolated module registry with its own LOG_LEVEL.
 */
function captureLog(
  level: string,
  emit: (logger: typeof import('../../src/utils/logger').logger) => void,
): string[] {
  const previousLevel = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;

  const lines: string[] = [];
  const record = (chunk: unknown): boolean => {
    lines.push(String(chunk));
    return true;
  };

  const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(record);
  const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(record);

  try {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { logger } = require('../../src/utils/logger');
      emit(logger);
    });
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    process.env.LOG_LEVEL = previousLevel;
  }

  return lines;
}

describe('structured logger', () => {
  it('emits parseable JSON with the expected envelope', () => {
    const [line] = captureLog('info', (logger) => logger.info('test.event', { userId: 'abc' }));
    const entry = JSON.parse(line as string);

    expect(entry.level).toBe('info');
    expect(entry.message).toBe('test.event');
    expect(entry.service).toBe('clauseguard-backend');
    expect(typeof entry.timestamp).toBe('string');
    expect(entry.context.userId).toBe('abc');
  });

  it('redacts credentials, tokens and API keys', () => {
    const [line] = captureLog('info', (logger) =>
      logger.error('test.event', {
        password: 'SuperSecret123',
        token: 'eyJhbGciOi.payload.sig',
        apiKey: 'AIzaSyEXAMPLE',
        authorization: 'Bearer abc.def.ghi',
        userId: '507f1f77bcf86cd799439011',
      }),
    );
    const { context } = JSON.parse(line as string);

    expect(context.password).toBe('[REDACTED]');
    expect(context.token).toBe('[REDACTED]');
    expect(context.apiKey).toBe('[REDACTED]');
    expect(context.authorization).toBe('[REDACTED]');
    // Non-sensitive identifiers stay intact for traceability.
    expect(context.userId).toBe('507f1f77bcf86cd799439011');
  });

  it('redacts raw contract text nested inside an object', () => {
    const [line] = captureLog('info', (logger) =>
      logger.info('test.event', { contract: { extractedText: 'Confidential clause text' } }),
    );
    const { context } = JSON.parse(line as string);
    expect(context.contract.extractedText).toBe('[REDACTED]');
  });

  it('serialises Error objects rather than emitting an empty object', () => {
    const [line] = captureLog('info', (logger) =>
      logger.error('test.event', { error: new Error('boom') }),
    );
    const { context } = JSON.parse(line as string);
    expect(context.error.message).toBe('boom');
    expect(typeof context.error.stack).toBe('string');
  });

  it('suppresses output below the configured level', () => {
    expect(captureLog('error', (logger) => logger.info('ignored'))).toHaveLength(0);
    expect(captureLog('silent', (logger) => logger.error('ignored'))).toHaveLength(0);
  });
});
