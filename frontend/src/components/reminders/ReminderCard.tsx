import { BellRing, Pencil, X, Mail, Terminal } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReminderStatusBadge } from '@/components/shared/StatusBadge';
import { formatDateTime } from '@/lib/format';
import type { Reminder } from '@/types/api';

export function ReminderCard({
  reminder,
  onEdit,
  onCancel,
  isPending,
}: {
  reminder: Reminder;
  onEdit: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const canModify = reminder.status === 'scheduled';
  const isEmail = reminder.channel === 'email';

  return (
    <Card className="shadow-[var(--shadow-xs)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all duration-150">
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="flex items-start gap-3.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-navy)]/5 text-[var(--color-text-primary)] border border-[var(--color-border)] shadow-xs">
            <BellRing className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
                {formatDateTime(reminder.reminderDate)}
              </p>
              <span className="inline-flex items-center gap-1 rounded bg-[var(--color-surface-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)] border border-[var(--color-border)]">
                {isEmail ? <Mail className="h-2.5 w-2.5" /> : <Terminal className="h-2.5 w-2.5" />}
                {isEmail ? 'Email dispatch' : 'System log'}
              </span>
            </div>

            <p className="mt-1 text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
              {reminder.message || 'Standard obligation deadline notification'}
            </p>

            {reminder.status === 'failed' && reminder.lastError && (
              <p className="mt-1 text-xs text-[var(--color-danger)] font-medium">
                Delivery failed: {reminder.lastError}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <ReminderStatusBadge status={reminder.status} />
        </div>
      </div>

      {canModify && (
        <div className="flex items-center gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-subtle)]/50 px-4 py-2.5 sm:px-5 rounded-b-[var(--radius-lg)]">
          <Button size="sm" variant="secondary" onClick={onEdit} disabled={isPending}>
            <Pencil className="h-3.5 w-3.5" />
            Edit schedule
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            isLoading={isPending}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] ml-auto"
          >
            <X className="h-3.5 w-3.5" />
            Cancel reminder
          </Button>
        </div>
      )}
    </Card>
  );
}
