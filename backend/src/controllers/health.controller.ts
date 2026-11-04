import type { Request, Response } from 'express';
import { databaseStatus, isDatabaseConnected } from '../config/database';
import { isAiConfigured } from '../services/ai';

export function health(_req: Request, res: Response): void {
  res.status(200).json({ success: true, message: 'ClauseGuard API is running' });
}

/** Deeper probe for orchestrators; 503 when a hard dependency is unavailable. */
export function readiness(_req: Request, res: Response): void {
  const databaseReady = isDatabaseConnected();
  res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    message: databaseReady ? 'ClauseGuard API is ready' : 'ClauseGuard API is not ready',
    data: {
      database: databaseStatus(),
      aiConfigured: isAiConfigured(),
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
}
