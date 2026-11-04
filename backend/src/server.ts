import type { Server } from 'node:http';

/**
 * Application entry point.
 *
 * Modules are imported dynamically inside a try/catch so that configuration
 * failures (a missing MONGODB_URI, a short JWT_SECRET) surface as a readable
 * message instead of an unhandled module-load stack trace.
 */

type Logger = typeof import('./utils/logger').logger;

let server: Server | null = null;
let shuttingDown = false;

function fail(message: string, detail?: unknown): never {
  process.stderr.write(`\n${message}\n`);
  if (detail instanceof Error) process.stderr.write(`${detail.message}\n\n`);
  process.exit(1);
}

async function shutdown(
  signal: string,
  logger: Logger,
  stopScheduler: () => Promise<void>,
  disconnectDatabase: () => Promise<void>,
  exitCode = 0,
): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info('server.shutdown_started', { signal });

  const forceExit = setTimeout(() => {
    logger.error('server.shutdown_timeout');
    process.exit(1);
  }, 15_000);
  forceExit.unref();

  try {
    await stopScheduler();
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await disconnectDatabase();
    logger.info('server.shutdown_complete');
    clearTimeout(forceExit);
    process.exit(exitCode);
  } catch (error) {
    logger.error('server.shutdown_failed', {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    process.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  // --- Configuration -------------------------------------------------------
  let env: typeof import('./config/env').env;
  let logger: Logger;

  try {
    ({ env } = await import('./config/env'));
    ({ logger } = await import('./utils/logger'));
  } catch (error) {
    fail(
      'ClauseGuard failed to start: invalid configuration.\n' +
        'Copy .env.example to .env and set the required values.',
      error,
    );
  }

  const { connectDatabase, disconnectDatabase } = await import('./config/database');
  const { createApp } = await import('./app');
  const { ensureUploadDirectory } = await import('./services/document.service');
  const { isAiConfigured } = await import('./services/ai');
  const { startScheduler, stopScheduler } = await import('./jobs');

  // --- Dependencies --------------------------------------------------------
  try {
    await connectDatabase();
  } catch (error) {
    logger.error('server.database_connection_failed', {
      error: error instanceof Error ? error : new Error(String(error)),
    });
    fail(
      'ClauseGuard failed to start: could not connect to MongoDB.\n' +
        'Check that MongoDB is running and MONGODB_URI is correct.',
      error,
    );
  }

  try {
    await ensureUploadDirectory();
  } catch (error) {
    fail(
      `ClauseGuard failed to start: upload directory "${env.UPLOAD_DIR}" is not writable.`,
      error,
    );
  }

  if (!isAiConfigured()) {
    // Startup is allowed so the API stays usable, but analysis will fail loudly.
    logger.warn('ai.not_configured', {
      hint: 'Set GEMINI_API_KEY to enable contract analysis.',
    });
  }

  // --- Serve ---------------------------------------------------------------
  const app = createApp();

  server = app.listen(env.PORT, () => {
    logger.info('server.started', {
      port: env.PORT,
      env: env.NODE_ENV,
      healthEndpoint: '/api/health',
    });
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      fail(`ClauseGuard failed to start: port ${env.PORT} is already in use.`);
    }
    fail('ClauseGuard failed to start: the HTTP server could not bind.', error);
  });

  startScheduler();

  // --- Lifecycle -----------------------------------------------------------
  const stop = (signal: string, code = 0) =>
    void shutdown(signal, logger, stopScheduler, disconnectDatabase, code);

  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('process.unhandled_rejection', {
      error: reason instanceof Error ? reason : new Error(String(reason)),
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('process.uncaught_exception', { error });
    stop('uncaughtException', 1);
  });
}

bootstrap().catch((error: unknown) => {
  fail('ClauseGuard failed to start.', error);
});
