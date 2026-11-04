import { markOverdueObligations } from '../services/obligation.service';
import { logger } from '../utils/logger';

/** Promotes confirmed obligations past their deadline to `overdue`. */
export async function runOverdueSweep(now: Date = new Date()): Promise<number> {
  const updated = await markOverdueObligations(now);
  if (updated > 0) {
    logger.info('obligation.overdue_sweep', { updated });
  }
  return updated;
}
