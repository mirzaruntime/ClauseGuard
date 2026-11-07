import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const booleanish = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),

  FRONTEND_URL: z.string().url().optional(),
  EMAIL_ENABLED: booleanish.default(true),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().trim().min(1).optional(),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

  AI_PROVIDER: z.enum(['gemini', 'groq']).default('gemini'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().min(1).default('gemini-2.0-flash'),
  GEMINI_API_BASE_URL: z
    .string()
    .url()
    .default('https://generativelanguage.googleapis.com'),

  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().min(1).default('llama-3.3-70b-versatile'),
  GROQ_API_BASE_URL: z
    .string()
    .url()
    .default('https://api.groq.com/openai/v1'),

  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  AI_MAX_INPUT_CHARS: z.coerce.number().int().positive().default(120_000),

  UPLOAD_DIR: z.string().min(1).default('uploads'),
  MAX_FILE_SIZE: z.coerce.number().int().positive().default(10 * 1024 * 1024),

  CORS_ORIGIN: z.string().trim().min(1).default('*'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  SCHEDULER_ENABLED: booleanish.default(true),
  REMINDER_CRON: z.string().min(1).default('* * * * *'),
  OVERDUE_CRON: z.string().min(1).default('0 * * * *'),
  SCHEDULER_TIMEZONE: z.string().min(1).default('UTC'),
  REMINDER_BATCH_SIZE: z.coerce.number().int().positive().default(50),
  REMINDER_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
}).superRefine((value, context) => {
  const configuredOrigins = value.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  const hasWildcardOrigin = configuredOrigins.includes('*');

  if (configuredOrigins.some((origin) => !origin)) {
    context.addIssue({
      code: 'custom',
      path: ['CORS_ORIGIN'],
      message: 'CORS_ORIGIN must contain non-empty origins',
    });
  }

  if (hasWildcardOrigin && configuredOrigins.length > 1) {
    context.addIssue({
      code: 'custom',
      path: ['CORS_ORIGIN'],
      message: 'CORS_ORIGIN cannot combine the wildcard with explicit origins',
    });
  }

  if (!hasWildcardOrigin) {
    for (const origin of configuredOrigins) {
      try {
        const parsedOrigin = new URL(origin);
        const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
        if (
          !['http:', 'https:'].includes(parsedOrigin.protocol) ||
          parsedOrigin.origin !== normalizedOrigin ||
          parsedOrigin.username ||
          parsedOrigin.password
        ) {
          context.addIssue({
            code: 'custom',
            path: ['CORS_ORIGIN'],
            message: 'CORS_ORIGIN entries must be origin URLs without paths or credentials',
          });
        } else if (value.NODE_ENV === 'production' && parsedOrigin.protocol !== 'https:') {
          context.addIssue({
            code: 'custom',
            path: ['CORS_ORIGIN'],
            message: 'CORS_ORIGIN entries must use HTTPS in production',
          });
        }
      } catch {
        context.addIssue({
          code: 'custom',
          path: ['CORS_ORIGIN'],
          message: 'CORS_ORIGIN entries must be valid origin URLs',
        });
      }
    }
  }

  if (value.NODE_ENV !== 'production') return;

  if (hasWildcardOrigin) {
    context.addIssue({
      code: 'custom',
      path: ['CORS_ORIGIN'],
      message: 'CORS_ORIGIN must list explicit allowed frontend origins in production',
    });
  }

  if (!value.FRONTEND_URL) {
    context.addIssue({ code: 'custom', path: ['FRONTEND_URL'], message: 'FRONTEND_URL is required in production' });
  } else if (new URL(value.FRONTEND_URL).protocol !== 'https:') {
    context.addIssue({ code: 'custom', path: ['FRONTEND_URL'], message: 'FRONTEND_URL must use HTTPS in production' });
  }

  if (value.EMAIL_ENABLED) {
    if (!value.RESEND_API_KEY) {
      context.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'RESEND_API_KEY is required when email is enabled',
      });
    }

    if (!value.EMAIL_FROM) {
      context.addIssue({
        code: 'custom',
        path: ['EMAIL_FROM'],
        message: 'EMAIL_FROM is required when email is enabled',
      });
    }
  }
});

export type AppEnv = z.infer<typeof envSchema> & {
  isProduction: boolean;
  isTest: boolean;
  isDevelopment: boolean;
  uploadDirAbsolute: string;
  corsOrigins: string[] | string;
};

/**
 * Parses and validates process.env exactly once.
 * Throws a descriptive error on startup rather than failing later at runtime.
 */
function loadEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const value = parsed.data;
  const corsOrigin = value.CORS_ORIGIN.trim();

  return {
    ...value,
    isProduction: value.NODE_ENV === 'production',
    isTest: value.NODE_ENV === 'test',
    isDevelopment: value.NODE_ENV === 'development',
    uploadDirAbsolute: path.isAbsolute(value.UPLOAD_DIR)
      ? value.UPLOAD_DIR
      : path.resolve(process.cwd(), value.UPLOAD_DIR),
    corsOrigins:
      corsOrigin === '*'
        ? '*'
        : [...new Set(corsOrigin.split(',').map((origin) => new URL(origin.trim()).origin))],
  };
}

export const env = loadEnv();
