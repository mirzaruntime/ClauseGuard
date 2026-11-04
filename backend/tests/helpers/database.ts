import mongoose from 'mongoose';

/**
 * The database-backed suites run only when TEST_MONGODB_URI points at a
 * disposable MongoDB instance. Without it they are skipped rather than
 * silently passing against a fake database.
 */
export const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI;
export const hasDatabase = Boolean(TEST_MONGODB_URI);

/** `describeWithDb` marks database suites as skipped when no instance is configured. */
export const describeWithDb: jest.Describe = hasDatabase ? describe : describe.skip;

export async function connectTestDatabase(): Promise<void> {
  if (!TEST_MONGODB_URI) return;
  const databaseName = new URL(TEST_MONGODB_URI).pathname.replace(/^\//, '');
  if (!/(^|[-_])test([-_]|$)/i.test(databaseName)) {
    throw new Error('TEST_MONGODB_URI must use an isolated database name containing "test"; refusing to connect or drop another database.');
  }
  await mongoose.connect(TEST_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
}

export async function clearTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;
  const collections = await mongoose.connection.db?.collections();
  for (const collection of collections ?? []) {
    await collection.deleteMany({});
  }
}

export async function disconnectTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase().catch(() => undefined);
    await mongoose.disconnect();
  }
}
