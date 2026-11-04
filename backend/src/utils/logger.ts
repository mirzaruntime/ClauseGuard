import { env } from '../config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<Level | 'silent', number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'jwt',
  'jwtsecret',
  'secret',
  'apikey',
  'api_key',
  'geminiapikey',
  'mongodburi',
  'extractedtext',
  'sourceclause',
  'text',
];

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || value === undefined) return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEYS.includes(key.toLowerCase())
        ? '[REDACTED]'
        : redact(item, depth + 1);
    }
    return output;
  }
  return value;
}

function write(level: Level, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[env.LOG_LEVEL]) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'clauseguard-backend',
    env: env.NODE_ENV,
    message,
    ...(context ? { context: redact(context) as Record<string, unknown> } : {}),
  };

  const serialized = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(`${serialized}\n`);
  else process.stdout.write(`${serialized}\n`);
}

/**
 * Structured JSON logger. Known-sensitive keys are redacted automatically so
 * passwords, tokens, API keys and raw contract text never reach the log stream.
 */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
};
