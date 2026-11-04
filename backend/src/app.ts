import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { API_BASE_PATH } from './config/constants';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { globalRateLimiter } from './middleware/rateLimit';
import { requestContext } from './middleware/requestContext';

/** Builds the Express application. No listening, no database - import-safe for tests. */
export function createApp(): Express {
  const app = express();

  // Required for correct client IPs (and therefore rate limiting) behind a proxy.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  app.use(
    cors({
      origin: env.corsOrigins,
      // Browsers reject credentialed CORS with `Access-Control-Allow-Origin: *`.
      // Wildcard mode is retained for local development without credentials.
      credentials: env.corsOrigins !== '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  app.use(requestContext);
  app.use(globalRateLimiter);

  app.use(API_BASE_PATH, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
