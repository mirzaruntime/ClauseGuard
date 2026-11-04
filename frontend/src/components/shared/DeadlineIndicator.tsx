import { Calendar } from 'lucide-react';
import { differenceInCalendarDays, format, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ObligationStatus } from '@/types/api';

/**
 * Maps a deadline + obligation status to the shared urgency semantics:
 * completed -> success, normal -> info, approaching (<=7 days) -> warning, overdue -> danger.
 */
export function DeadlineIndicator({
  deadline,
  status,
  className,
}: {
  deadline: string | null;
  status: ObligationStatus;
  className?: string;
}) {
  if (!deadline) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs text-[var(--color-text-faint)]', className)}>
        <Calendar className="h-3.5 w-3.5 text-[var(--color-text-faint)] shrink-0" />
        <span>No deadline</span>
      </span>
    );
  }

  const date = new Date(deadline);
  const daysLeft = differenceInCalendarDays(date, new Date());

  let tone: 'success' | 'info' | 'warning' | 'danger' = 'info';
  let label = format(date, 'MMM d, yyyy');

  if (status === 'completed') {
    tone = 'success';
  } else if (status === 'overdue' || (isPast(date) && status !== 'rejected')) {
    tone = 'danger';
    label = `${format(date, 'MMM d, yyyy')} · overdue`;
  } else if (daysLeft <= 7) {
    tone = 'warning';
    label = `${format(date, 'MMM d, yyyy')} · ${daysLeft <= 0 ? 'today' : `${daysLeft}d left`}`;
  }

  const dotColor = {
    success: 'bg-[var(--color-success)]',
    info: 'bg-[var(--color-info)]',
    warning: 'bg-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]',
  }[tone];

  const textColor = {
    success: 'text-[var(--color-success)]',
    info: 'text-[var(--color-text-muted)]',
    warning: 'text-[var(--color-warning)] font-medium',
    danger: 'text-[var(--color-danger)] font-medium',
  }[tone];

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', textColor, className)}>
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          dotColor,
          tone === 'danger' && 'animate-pulse',
        )}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}
