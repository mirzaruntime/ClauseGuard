import { Calendar, Check, Clock, Pencil, Sparkles, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SourceClauseViewer } from './SourceClauseViewer';
import { ConfidenceMeter } from './ConfidenceMeter';
import { formatDate } from '@/lib/format';
import type { Obligation } from '@/types/api';

/** One AI-generated obligation awaiting a human decision. */
export function AISuggestionCard({
  obligation,
  onConfirm,
  onReject,
  onEdit,
  isPending,
}: {
  obligation: Obligation;
  onConfirm: () => void;
  onReject: () => void;
  onEdit: () => void;
  isPending: boolean;
}) {
  return (
    <Card
      variant="ai"
      className="relative overflow-hidden transition-colors duration-150 hover:border-[var(--color-border-strong)]"
    >
      {/* Top Header Strip with AI Badge & Confidence */}
      <div className="flex items-center justify-between gap-3 p-4 sm:p-5 pb-0 sm:pb-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-orange-subtle)] px-2.5 py-0.5 border border-[var(--color-orange)]/25 text-[11px] font-bold tracking-wide uppercase text-[var(--color-orange-text)]">
            <Sparkles className="h-3 w-3 text-[var(--color-orange)]" />
            AI Suggestion · Needs Review
          </span>
        </div>
        <ConfidenceMeter confidence={obligation.confidence} />
      </div>

      {/* Main Content Body */}
      <div className="space-y-3.5 p-4 sm:p-5">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-[var(--color-text-primary)] leading-snug">
            {obligation.title}
          </h4>
          <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[var(--color-text)]">
            {obligation.description}
          </p>
        </div>

        <SourceClauseViewer clause={obligation.sourceClause} />

        {obligation.aiExplanation && (
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)] p-3 text-xs leading-relaxed text-[var(--color-text-muted)] border border-[var(--color-border)]">
            <span className="font-semibold text-[var(--color-text-primary)]">Legal Context & Rationale: </span>
            {obligation.aiExplanation}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--color-text-muted)] pt-1">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[var(--color-text-faint)] shrink-0" />
            <span className="font-semibold text-[var(--color-text-primary)]">Deadline:</span>
            <span>{obligation.deadline ? formatDate(obligation.deadline) : 'Not specified'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[var(--color-text-faint)] shrink-0" />
            <span className="font-semibold text-[var(--color-text-primary)]">Notice period:</span>
            <span>{obligation.noticePeriod ?? 'None'}</span>
          </span>
        </div>

        {obligation.conditions.length > 0 && (
          <div className="pt-1">
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">Trigger conditions:</p>
            <ul className="mt-1.5 space-y-1 pl-1 text-xs text-[var(--color-text-muted)]">
              {obligation.conditions.map((condition, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-orange)] shrink-0" />
                  <span>{condition}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Review Actions Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface-subtle)]/60 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="accent" onClick={onConfirm} isLoading={isPending} className="shadow-sm">
            <Check className="h-3.5 w-3.5" />
            Confirm obligation
          </Button>
          <Button size="sm" variant="secondary" onClick={onEdit} disabled={isPending}>
            <Pencil className="h-3.5 w-3.5" />
            Edit details
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onReject}
          disabled={isPending}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
        >
          <X className="h-3.5 w-3.5" />
          Reject suggestion
        </Button>
      </div>
    </Card>
  );
}
