import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownAZ, ArrowUpZA, ListChecks, X, Plus, Sparkles, Filter } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PaginationBar } from '@/components/shared/Pagination';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { AISuggestionCard } from '@/components/obligations/AISuggestionCard';
import { ObligationEditDialog } from '@/components/obligations/ObligationEditDialog';
import { ObligationCard } from '@/components/obligations/ObligationCard';
import { PageTransition, PageHeaderReveal, FadeUp, StaggerContainer, StaggerItem } from '@/components/shared/Motion';
import { useObligations } from '@/hooks/useObligations';
import { useObligationActions } from '@/hooks/useObligationActions';
import { cn } from '@/lib/utils';
import type { Obligation, ObligationStatus } from '@/types/api';

const STATUS_PILLS: { value: ObligationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All obligations' },
  { value: 'potential', label: 'Needs review' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

const SORT_OPTIONS: { value: 'deadline' | 'createdAt' | 'confidence' | 'status'; label: string }[] = [
  { value: 'deadline', label: 'Deadline' },
  { value: 'createdAt', label: 'Date added' },
  { value: 'confidence', label: 'AI confidence' },
  { value: 'status', label: 'Status' },
];

export function ObligationsPage() {
  const {
    data,
    isLoading,
    isError,
    isEmpty,
    error,
    errorCode,
    refetch,
    setPage,
    status,
    setStatus,
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
  } = useObligations();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const [overlay, setOverlay] = useState<Map<string, Obligation>>(() => new Map());

  const applyMutation = (updated: Obligation) => {
    setOverlay((prev) => {
      const next = new Map(prev);
      next.set(updated.id, updated);
      return next;
    });
  };

  const { confirm, reject, complete, restore, edit, pendingId } = useObligationActions(applyMutation);

  const rawObligations = data?.obligations;
  const list = useMemo(() => {
    if (!rawObligations) return [];
    return rawObligations.map((o) => overlay.get(o.id) ?? o);
  }, [rawObligations, overlay]);

  const editingObligation = list.find((o) => o.id === editingId) ?? null;
  const rejectingObligation = list.find((o) => o.id === rejectingId) ?? null;

  const hasActiveFilters = Boolean(status) || Boolean(search);

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <PageTransition className="space-y-5 sm:space-y-6">
      <PageHeaderReveal>
        <PageHeader
          title="Obligations Tracker"
          description="Every legal commitment and condition extracted from your contracts, organized by deadline and review status."
        />
      </PageHeaderReveal>

      {/* Quick Status Navigation Pills */}
      <FadeUp delay={0.04}>
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_PILLS.map((pill) => {
            const isActive = (pill.value === 'all' && !status) || status === pill.value;
            return (
              <button
                key={pill.value}
                type="button"
                onClick={() => setStatus(pill.value === 'all' ? undefined : (pill.value as ObligationStatus))}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer select-none border',
                  isActive
                    ? 'bg-[var(--color-navy)] text-white border-[var(--color-navy)] shadow-xs'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]',
                )}
              >
                {pill.value === 'potential' && (
                  <Sparkles className={cn('h-3 w-3', isActive ? 'text-amber-300' : 'text-[var(--color-warning)]')} />
                )}
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>
      </FadeUp>

      {/* Filter & Sort Bar */}
      <FadeUp delay={0.08}>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-xs)] sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search obligations by title or description..."
                className="w-full sm:w-80"
              />

              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        Sort: {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={toggleSortOrder}
                  className="h-9 px-2.5 shrink-0"
                  title={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                >
                  {sortOrder === 'asc' ? (
                    <ArrowDownAZ className="h-4 w-4 text-[var(--color-text-primary)]" />
                  ) : (
                    <ArrowUpZA className="h-4 w-4 text-[var(--color-text-primary)]" />
                  )}
                  <span className="sr-only">Toggle sort direction</span>
                </Button>
              </div>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatus(undefined);
                    setSearch('');
                  }}
                  className="w-fit text-xs text-[var(--color-text-faint)] hover:text-[var(--color-danger)] transition-colors h-9"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Reset filters
                </Button>
              )}
            </div>

            {data && (
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] shrink-0 self-end sm:self-center font-medium">
                <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-navy)]" />
                <span>
                  {data.pagination.total} obligation{data.pagination.total === 1 ? '' : 's'} tracked
                </span>
              </div>
            )}
          </div>
        </div>
      </FadeUp>

      {isError && (
        <ErrorState message={error ?? 'Failed to load obligations'} isNetworkError={errorCode === null} onRetry={refetch} />
      )}

      {!isError && isLoading && (
        <div className="space-y-3.5">
          <Skeleton className="h-36 w-full rounded-[var(--radius-xl)]" />
          <Skeleton className="h-36 w-full rounded-[var(--radius-xl)]" />
          <Skeleton className="h-36 w-full rounded-[var(--radius-xl)]" />
        </div>
      )}

      {!isError && !isLoading && isEmpty && (
        <FadeUp delay={0.12}>
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-[var(--shadow-xs)]">
            <EmptyState
              size="default"
              icon={ListChecks}
              title={hasActiveFilters ? 'No obligations match your current filters' : 'No obligations on file'}
              description={
                hasActiveFilters
                  ? 'Try adjusting your search criteria or checking other status filter categories.'
                  : 'Upload a contract document to allow AI to parse clauses and extract obligations for your review.'
              }
              action={
                !hasActiveFilters ? (
                  <Button asChild variant="accent">
                    <Link to="/contracts/upload">
                      <Plus className="h-4 w-4" />
                      Upload contract
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStatus(undefined);
                      setSearch('');
                    }}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    Clear filters
                  </Button>
                )
              }
            />
          </div>
        </FadeUp>
      )}

      {!isError && !isLoading && list.length > 0 && (
        <>
          <StaggerContainer
            staggerDelay={0.04}
            delayChildren={0.06}
            className="space-y-3.5 sm:space-y-4"
          >
            {list.map((obligation) => (
              <StaggerItem key={obligation.id}>
                {obligation.status === 'potential' ? (
                  <AISuggestionCard
                    obligation={obligation}
                    isPending={pendingId === obligation.id}
                    onConfirm={() => void confirm(obligation.id)}
                    onEdit={() => setEditingId(obligation.id)}
                    onReject={() => setRejectingId(obligation.id)}
                  />
                ) : (
                  <ObligationCard
                    obligation={obligation}
                    isPending={pendingId === obligation.id}
                    onComplete={() => void complete(obligation.id)}
                    onReject={() => void reject(obligation.id)}
                    onRestore={() => void restore(obligation.id)}
                  />
                )}
              </StaggerItem>
            ))}
          </StaggerContainer>
          {data && <PaginationBar pagination={data.pagination} onPageChange={setPage} />}
        </>
      )}

      <ObligationEditDialog
        key={editingId ?? "closed"}
        obligation={editingObligation}
        open={editingId !== null}
        onOpenChange={(open) => !open && setEditingId(null)}
        isSaving={pendingId === editingId}
        onSave={(payload) => (editingId ? edit(editingId, payload) : Promise.resolve())}
      />

      <ConfirmationDialog
        open={rejectingId !== null}
        onOpenChange={(open) => !open && setRejectingId(null)}
        title="Reject this obligation?"
        description={`"${rejectingObligation?.title}" will be marked as rejected. You can restore it for review later if needed.`}
        confirmLabel="Reject"
        variant="danger"
        onConfirm={() => (rejectingId ? reject(rejectingId) : Promise.resolve())}
      />
    </PageTransition>
  );
}
