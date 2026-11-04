import { useCallback } from 'react';
import { contractsApi, obligationsApi, remindersApi } from '@/api';
import { useAsync } from './useAsync';
import type { Contract, Obligation, ObligationStats, Reminder } from '@/types/api';

export interface DashboardData {
  stats: ObligationStats;
  contractsTotal: number;
  recentContracts: Contract[];
  pendingReview: Obligation[];
  upcomingDeadlines: Obligation[];
  overdueObligations: Obligation[];
  upcomingReminders: Reminder[];
}

/**
 * Dashboard reads are composed entirely from real endpoints already required
 * by other pages — no dedicated /dashboard endpoint exists on the backend, so
 * this hook fetches in parallel and assembles the view from live data.
 */
export function useDashboardData() {
  const fetcher = useCallback(async (): Promise<DashboardData> => {
    const [stats, contracts, pendingReview, upcomingDeadlines, overdue, reminders] =
      await Promise.all([
        obligationsApi.stats(),
        contractsApi.list({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        obligationsApi.list({ status: 'potential', limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        obligationsApi.list({ status: 'confirmed', limit: 5, sortBy: 'deadline', sortOrder: 'asc' }),
        obligationsApi.list({ status: 'overdue', limit: 5, sortBy: 'deadline', sortOrder: 'asc' }),
        remindersApi.list({ status: 'scheduled', limit: 5, sortBy: 'reminderDate', sortOrder: 'asc' }),
      ]);

    return {
      stats,
      contractsTotal: contracts.pagination.total,
      recentContracts: contracts.contracts,
      pendingReview: pendingReview.obligations,
      upcomingDeadlines: upcomingDeadlines.obligations.filter((o) => o.deadline),
      overdueObligations: overdue.obligations,
      upcomingReminders: reminders.reminders,
    };
  }, []);

  return useAsync(fetcher);
}
