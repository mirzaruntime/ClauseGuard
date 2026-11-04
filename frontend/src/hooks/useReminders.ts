import { useCallback, useState } from 'react';
import { obligationsApi, remindersApi } from '@/api';
import { useAsync } from './useAsync';
import type { ReminderStatus, ListObligationsRequest } from '@/types/api';

export function useReminders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReminderStatus | undefined>(undefined);

  const fetcher = useCallback(
    () => remindersApi.list({ page, limit: 10, status, sortBy: 'reminderDate', sortOrder: 'asc' }),
    [page, status],
  );

  const result = useAsync(fetcher, {
    isEmpty: (data) => data.reminders.length === 0,
  });

  return {
    ...result,
    page,
    setPage,
    status,
    setStatus: (value: ReminderStatus | undefined) => {
      setStatus(value);
      setPage(1);
    },
    refresh: result.refetch,
  };
}

function fetchByStatus(status: ListObligationsRequest['status']) {
  return obligationsApi.list({ status, limit: 50, sortBy: 'deadline', sortOrder: 'asc' });
}

/** Fetches a small pool of obligations eligible for a new reminder (confirmed or overdue). */
export function useReminderEligibleObligations() {
  const fetcher = useCallback(async () => {
    const [{ obligations: overdue }, { obligations: confirmed }] = await Promise.all([
      fetchByStatus('overdue'),
      fetchByStatus('confirmed'),
    ]);
    return [...overdue, ...confirmed];
  }, []);

  return useAsync(fetcher);
}
