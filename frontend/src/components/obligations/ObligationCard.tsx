import { Check, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ObligationStatusBadge } from '@/components/shared/StatusBadge';
import { DeadlineIndicator } from '@/components/shared/DeadlineIndicator';
import { ConfidenceMeter } from './ConfidenceMeter';
import { cn } from '@/lib/utils';
import type { Obligation } from '@/types/api';

/**
 * Display for a reviewed (non-potential) obligation. Actions are contextual
 * to the backend's actual allowed transitions for the current status.
 */
export function ObligationCard({
  obligation,
  onComplete,
  onReject,
  onRestore,
  isPending,
  showContractLink,
  contractTitle,
}: {
  obligation: Obligation;
  onComplete?: () => void;
  onReject?: () => void;
  onRestore?: () => void;
  isPending: boolean;
  showContractLink?: boolean;
  contractTitle?: string;
}) {
  const canComplete = obligation.status === 'confirmed' || obligation.status === 'overdue';
  const canReject = obligation.status === 'confirmed' || obligation.status === 'overdue';
  const canRestore = obligation.status === 'rejected';
  const isCompleted = obligation.status === 'completed';
  const isOverdue = obligation.status === 'overdue';
  const isConfirmed = obligation.status === 'confirmed';

  const cardBorderClass = isOverdue
    ? 'border-l-[3px] border-l-[var(--color-danger)] border-[var(--color-danger-border)] bg-[var(--color-danger-bg)]'
    : isCompleted
      ? 'border-[var(--color-border)] bg-[var(--color-surface-subtle)]/50 opacity-80 hover:opacity-100 transition-opacity'
      : isConfirmed
        ? 'border-l-[3px] border-l-[var(--color-success)] border-[var(--color-border)] bg-[var(--color-surface)]'
        : 'border-[var(--color-border)] bg-[var(--color-surface)]';

  return (
    <Card
      className={cn(
        cardBorderClass,
        'shadow-[var(--shadow-xs)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all duration-150',
      )}
    >
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {showContractLink && contractTitle && (
              <p className="truncate text-[11px] font-semibold text-[var(--color-text-faint)] uppercase tracking-wider mb-1">
                {contractTitle}
              </p>
            )}
            <h4
              className={cn(
                'text-sm sm:text-base font-semibold leading-snug tracking-tight',
                isCompleted
                  ? 'text-[var(--color-text-muted)] line-through decoration-slate-300'
                  : 'text-[var(--color-text-primary)]',
              )}
            >
              {obligation.title}
            </h4>
          </div>
          <ObligationStatusBadge status={obligation.status} />
        </div>

        <p className="text-xs sm:text-sm leading-relaxed text-[var(--color-text-muted)]">
          {obligation.description}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
          <DeadlineIndicator deadline={obligation.deadline} status={obligation.status} />
          {obligation.aiGenerated && <ConfidenceMeter confidence={obligation.confidence} />}
        </div>
      </div>

      {(canComplete || canReject || canRestore) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-subtle)]/50 px-4 py-2.5 sm:px-5 rounded-b-[var(--radius-lg)]">
          <div className="flex flex-wrap items-center gap-2">
            {canComplete && onComplete && (
              <Button size="sm" variant="primary" onClick={onComplete} isLoading={isPending} className="shadow-xs">
                <Check className="h-3.5 w-3.5" />
                Mark complete
              </Button>
            )}
            {canRestore && onRestore && (
              <Button size="sm" variant="secondary" onClick={onRestore} isLoading={isPending}>
                <RotateCcw className="h-3.5 w-3.5" />
                Restore for review
              </Button>
            )}
          </div>

          {canReject && onReject && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onReject}
              disabled={isPending}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
            >
              <X className="h-3.5 w-3.5" />
              Reject obligation
            </Button>
          )}

          {isCompleted && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-success)] ml-auto font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
