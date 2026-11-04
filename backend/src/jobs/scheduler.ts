import cron, { type ScheduledTask } from 'node-cron';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { isDatabaseConnected } from '../config/database';
import { dispatchDueReminders } from './reminder.job';
import { runOverdueSweep } from './overdue.job';

let tasks: ScheduledTask[] = [];

/**
 * Wraps a job so a failure is logged and contained, never crashing the process
 * and never silently disappearing.
 */
function guard(name: string, job: () => Promise<unknown>): () => Promise<void> {
  return async () => {
    if (!isDatabaseConnected()) {
      logger.warn('scheduler.skipped_no_database', { job: name });
      return;
    }
    try {
      await job();
    } catch (error) {
      logger.error('scheduler.job_failed', {
        job: name,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  };
}

/**
 * Starts background jobs. Idempotent: calling it twice does not create
 * duplicate cron tasks. All schedules run against SCHEDULER_TIMEZONE (UTC by
 * default) and `noOverlap` prevents a slow run from stacking on itself.
 */
export function startScheduler(): void {
  if (!env.SCHEDULER_ENABLED) {
    logger.info('scheduler.disabled');
    return;
  }
  if (tasks.length > 0) {
    logger.warn('scheduler.already_started');
    return;
  }

  for (const expression of [env.REMINDER_CRON, env.OVERDUE_CRON]) {
    if (!cron.validate(expression)) {
      throw new Error(`Invalid cron expression: "${expression}"`);
    }
  }

  const options = { timezone: env.SCHEDULER_TIMEZONE, noOverlap: true };

  tasks = [
    cron.schedule(
      env.REMINDER_CRON,
      guard('reminder-dispatch', () => dispatchDueReminders()),
      { ...options, name: 'reminder-dispatch' },
    ),
    cron.schedule(
      env.OVERDUE_CRON,
      guard('overdue-sweep', () => runOverdueSweep()),
      { ...options, name: 'overdue-sweep' },
    ),
  ];

  logger.info('scheduler.started', {
    timezone: env.SCHEDULER_TIMEZONE,
    reminderCron: env.REMINDER_CRON,
    overdueCron: env.OVERDUE_CRON,
  });
}

export async function stopScheduler(): Promise<void> {
  await Promise.all(tasks.map(async (task) => task.stop()));
  tasks = [];
  logger.info('scheduler.stopped');
}
