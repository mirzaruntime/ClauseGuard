import { useEffect, useState } from 'react';
import { remindersApi } from '@/api';
import type { Obligation, Reminder } from '@/types/api';

/**
 * The backend's reminder list only filters by `obligationId`, not contract —
 * so a contract's reminders are assembled from its obligations' own reminder
 * lists via the real endpoint, one call per eligible obligation.
 */
export function useContractReminders(obligations: Obligation[]) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const eligibleIds = obligations
    .filter((o) => o.status === 'confirmed' || o.status === 'overdue' || o.status === 'completed')
    .map((o) => o.id)
    .sort()
    .join(',');

  useEffect(() => {
    let cancelled = false;

    // Every state update below runs inside a promise callback (never
    // synchronously in the effect body itself), matching the "subscribe to
    // an external async operation" pattern for effects.
    Promise.resolve().then(() => {
      if (!cancelled) setIsLoading(true);
    });

    const ids = eligibleIds ? eligibleIds.split(',') : [];
    const request =
      ids.length > 0
        ? Promise.all(ids.map((id) => remindersApi.list({ obligationId: id, limit: 20 })))
        : Promise.resolve([]);

    request
      .then((results) => {
        if (cancelled) return;
        const flat = results.flatMap((r) => r.reminders);
        flat.sort((a, b) => new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime());
        setReminders(flat);
      })
      .catch(() => {
        if (!cancelled) setReminders([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eligibleIds]);

  return { reminders, isLoading };
}
