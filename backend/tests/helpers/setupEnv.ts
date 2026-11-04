/**
 * Loaded by Jest before any module under test. Guarantees a valid, non-secret
 * environment so config validation succeeds without a real .env file.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '4999';
process.env.MONGODB_URI =
  process.env.TEST_MONGODB_URI ?? 'mongodb://127.0.0.1:27017/clauseguard-test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-only-secret-value-that-is-long-enough-1234567890';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_SALT_ROUNDS = '8';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'tmp-test-uploads';
process.env.LOG_LEVEL = 'silent';
process.env.SCHEDULER_ENABLED = 'false';
process.env.CORS_ORIGIN = '*';
process.env.FRONTEND_URL = 'http://localhost:5173';
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_FROM;
delete process.env.GEMINI_API_KEY;

export {};
