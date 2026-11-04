import { Link } from 'react-router-dom';
import { FileText, ArrowUpRight, Sparkles } from 'lucide-react';
import { ContractStatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, formatFileSize } from '@/lib/format';
import type { Contract } from '@/types/api';

export function ContractCard({ contract }: { contract: Contract }) {
  const hasObligations = contract.status !== 'failed' && contract.status !== 'uploaded';
  const needsReview = contract.status === 'review';

  return (
    <Link
      to={`/contracts/${contract.id}`}
      className="group relative flex flex-col gap-2.5 px-4 py-3 sm:py-3.5 transition-all duration-150 hover:bg-[var(--color-surface-subtle)] sm:flex-row sm:items-center sm:gap-4 border-b border-[var(--color-border)] last:border-b-0"
    >
      {/* Left accent indicator for review state */}
      {needsReview && (
        <span
          className="absolute left-0 top-2 bottom-2 w-0.75 rounded-r bg-[var(--color-orange)]"
          aria-hidden="true"
        />
      )}

      {/* Main Title & Document Meta */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-navy)]/5 text-[var(--color-text-primary)] group-hover:bg-[var(--color-navy)] group-hover:text-white transition-all duration-200 border border-[var(--color-border)] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <FileText className="h-4.5 w-4.5" />
          {needsReview && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-orange)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-orange)]" />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-xs sm:text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-link)] transition-colors">
              {contract.title}
            </p>
            {needsReview && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded bg-[var(--color-orange-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-orange-text)] border border-[var(--color-orange)]/20">
                <Sparkles className="h-2.5 w-2.5" />
                Review
              </span>
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-text-faint)]">
            <span className="text-[var(--color-text-muted)] font-mono">{contract.originalFileName}</span>
            <span>·</span>
            <span>{formatFileSize(contract.fileSize)}</span>
            {contract.pageCount !== undefined && <span>· {contract.pageCount} pages</span>}
            {contract.parties && contract.parties.length > 0 && (
              <>
                <span className="hidden md:inline">·</span>
                <span className="hidden md:inline truncate max-w-[180px] text-[var(--color-text-muted)]">
                  {contract.parties.join(', ')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Status, Obligations, Date & Chevron */}
      <div className="flex items-center justify-between gap-3 pl-12 sm:pl-0 sm:shrink-0">
        <div className="sm:w-36 shrink-0">
          <ContractStatusBadge status={contract.status} />
        </div>

        <div className="hidden sm:block sm:w-28 text-xs shrink-0">
          {hasObligations ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--color-surface-subtle)] border border-[var(--color-border)] font-medium text-[var(--color-text-primary)]">
              <span className="font-bold text-[var(--color-text-primary)]">{contract.obligationCount}</span>
              <span className="text-[var(--color-text-faint)] text-[11px]">
                obligation{contract.obligationCount === 1 ? '' : 's'}
              </span>
            </span>
          ) : (
            <span className="text-[var(--color-text-faint)] text-xs">—</span>
          )}
        </div>

        <div className="hidden lg:block lg:w-28 text-xs text-[var(--color-text-muted)] shrink-0 font-medium">
          <span>{formatDate(contract.createdAt)}</span>
        </div>

        <div className="flex items-center justify-end w-8 shrink-0">
          <ArrowUpRight className="h-4 w-4 text-[var(--color-text-faint)] group-hover:text-[var(--color-text-primary)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150" />
        </div>
      </div>
    </Link>
  );
}
