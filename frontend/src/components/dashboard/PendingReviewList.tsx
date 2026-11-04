import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatConfidence } from '@/lib/format';
import type { Obligation } from '@/types/api';

export function PendingReviewList({ obligations }: { obligations: Obligation[] }) {
  if (obligations.length === 0) {
    return (
      <EmptyState
        size="compact"
        icon={Sparkles}
        title="Review queue is clear"
        description="All extracted clauses have been reviewed. New AI suggestions will appear here after contract upload."
      />
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {obligations.map((obligation) => (
        <li key={obligation.id}>
          <Link
            to={`/obligations?highlight=${obligation.id}`}
            className="group flex items-center gap-3 py-3 px-2 -mx-2 rounded-[var(--radius-md)] transition-all duration-150 hover:bg-[var(--color-surface-subtle)]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-orange-subtle)] text-[var(--color-orange-text)] border border-[var(--color-orange)]/20 shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-orange-text)] transition-colors">
                {obligation.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-semibold text-[var(--color-warning)]">
                  {formatConfidence(obligation.confidence)} confidence
                </span>
                {obligation.deadline && (
                  <span className="text-[11px] text-[var(--color-text-faint)]">
                    · Due {new Date(obligation.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-faint)] group-hover:text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-all duration-150" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
