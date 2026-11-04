import { BellRing } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateTime } from '@/lib/format';
import type { Reminder } from '@/types/api';

export function UpcomingRemindersList({ reminders }: { reminders: Reminder[] }) {
  if (reminders.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={BellRing}
        title="No reminders scheduled"
        description="Set a reminder from any confirmed obligation."
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {reminders.map((reminder) => (
        <li key={reminder.id} className="flex items-center gap-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-info-bg)] text-[var(--color-info)]">
            <BellRing className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs sm:text-sm font-medium text-[var(--color-text-primary)]">
              {reminder.message || 'Obligation reminder'}
            </p>
            <p className="text-[11px] text-[var(--color-text-faint)]">{formatDateTime(reminder.reminderDate)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
