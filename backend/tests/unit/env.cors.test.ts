const CONTROLLED_ENV_KEYS = [
  'NODE_ENV',
  'MONGODB_URI',
  'JWT_SECRET',
  'FRONTEND_URL',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'CORS_ORIGIN',
  'SCHEDULER_ENABLED',
] as const;

function loadEnv(overrides: Partial<Record<(typeof CONTROLLED_ENV_KEYS)[number], string>>) {
  const previous = new Map(CONTROLLED_ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of CONTROLLED_ENV_KEYS) delete process.env[key];

  Object.assign(process.env, {
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/clauseguard-test',
    JWT_SECRET: 'test-only-secret-value-that-is-long-enough',
    FRONTEND_URL: 'https://app.example.com',
    RESEND_API_KEY: 'test-resend-key',
    EMAIL_FROM: 'ClauseGuard <notifications@example.com>',
    CORS_ORIGIN: '*',
    ...overrides,
  });

  let loaded: typeof import('../../src/config/env') | undefined;
  let failure: unknown;
  try {
    jest.isolateModules(() => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        loaded = require('../../src/config/env') as typeof import('../../src/config/env');
      } catch (error) {
        failure = error;
      } finally {
        jest.dontMock('dotenv');
      }
    });
  } finally {
    for (const key of CONTROLLED_ENV_KEYS) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  return { loaded, failure };
}

describe('CORS environment validation', () => {
  it('preserves wildcard configuration for local development', () => {
    const { loaded, failure } = loadEnv({ NODE_ENV: 'development' });

    expect(failure).toBeUndefined();
    expect(loaded?.env.corsOrigins).toBe('*');
  });

  it('rejects wildcard CORS in production', () => {
    const { loaded, failure } = loadEnv({ CORS_ORIGIN: '*' });

    expect(loaded).toBeUndefined();
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain('CORS_ORIGIN');
    expect((failure as Error).message).toContain('explicit allowed frontend origins');
  });

  it('accepts explicit HTTPS origins and normalizes a trailing slash', () => {
    const { loaded, failure } = loadEnv({
      CORS_ORIGIN: 'https://app.example.com, https://admin.example.com/',
    });

    expect(failure).toBeUndefined();
    expect(loaded?.env.corsOrigins).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ]);
  });

  it('rejects non-HTTPS production origins', () => {
    const { loaded, failure } = loadEnv({ CORS_ORIGIN: 'http://app.example.com' });

    expect(loaded).toBeUndefined();
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain('CORS_ORIGIN');
    expect((failure as Error).message).toContain('must use HTTPS in production');
  });

  it('rejects combining wildcard and explicit origins', () => {
    const { loaded, failure } = loadEnv({
      NODE_ENV: 'development',
      CORS_ORIGIN: '*,http://localhost:5173',
    });

    expect(loaded).toBeUndefined();
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain('cannot combine the wildcard');
  });
});

describe('SCHEDULER_ENABLED environment validation', () => {
  it('defaults to true when the variable is missing', () => {
    const { loaded, failure } = loadEnv({ NODE_ENV: 'development' });

    expect(failure).toBeUndefined();
    expect(loaded?.env.SCHEDULER_ENABLED).toBe(true);
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('parses explicit %s as %s', (value, expected) => {
    const { loaded, failure } = loadEnv({
      NODE_ENV: 'development',
      SCHEDULER_ENABLED: value as string,
    });

    expect(failure).toBeUndefined();
    expect(loaded?.env.SCHEDULER_ENABLED).toBe(expected);
  });

  it('rejects values other than true and false', () => {
    const { loaded, failure } = loadEnv({
      NODE_ENV: 'development',
      SCHEDULER_ENABLED: 'yes',
    });

    expect(loaded).toBeUndefined();
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain('SCHEDULER_ENABLED');
  });
});
