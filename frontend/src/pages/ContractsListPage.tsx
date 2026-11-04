import { Link } from 'react-router-dom';
import { ArrowDownAZ, ArrowUpZA, FileText, Plus, X, Filter } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchInput } from '@/components/shared/SearchInput';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PaginationBar } from '@/components/shared/Pagination';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { ContractCard } from '@/components/contracts/ContractCard';
import { ContractCardSkeleton } from '@/components/contracts/ContractCardSkeleton';
import { PageTransition, PageHeaderReveal, FadeUp, StaggerContainer, StaggerItem } from '@/components/shared/Motion';
import { useContracts } from '@/hooks/useContracts';
import type { ContractStatus, ListContractsRequest } from '@/types/api';

const STATUS_OPTIONS: { value: ContractStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'processing', label: 'Processing' },
  { value: 'analyzing', label: 'Analyzing' },
  { value: 'review', label: 'Awaiting review' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const SORT_OPTIONS: { value: NonNullable<ListContractsRequest['sortBy']>; label: string }[] = [
  { value: 'createdAt', label: 'Date uploaded' },
  { value: 'updatedAt', label: 'Last updated' },
  { value: 'title', label: 'Contract title' },
  { value: 'status', label: 'Status' },
];

export function ContractsListPage() {
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
  } = useContracts();

  const hasActiveFilters = Boolean(status) || Boolean(search);

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <PageTransition className="space-y-5 sm:space-y-6">
      <PageHeaderReveal>
        <PageHeader
          title="Contracts Repository"
          description="Every legal contract indexed and processed, organized by status, obligations, and review cycle."
          actions={
            <Button asChild variant="accent">
              <Link to="/contracts/upload">
                <Plus className="h-4 w-4" />
                Upload contract
              </Link>
            </Button>
          }
        />
      </PageHeaderReveal>

      {/* Filter and Control Toolbar (Ironclad-inspired) */}
      <FadeUp delay={0.06}>
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-xs)] sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search contracts by title..."
                className="w-full sm:w-80"
              />
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <Select
                  value={status ?? 'all'}
                  onValueChange={(value) => setStatus(value === 'all' ? undefined : (value as ContractStatus))}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={sortBy ?? 'createdAt'}
                  onValueChange={(value) => setSortBy(value as NonNullable<ListContractsRequest['sortBy']>)}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        Sort: {option.label}
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
                <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-success)]" />
                <span>
                  {data.pagination.total} document{data.pagination.total === 1 ? '' : 's'} total
                </span>
              </div>
            )}
          </div>
        </div>
      </FadeUp>

      {isError && (
        <ErrorState
          message={error ?? 'Failed to load contracts'}
          isNetworkError={errorCode === null}
          onRetry={refetch}
        />
      )}

      {/* Contract Repository Workspace Table */}
      {!isError && (
        <FadeUp delay={0.12}>
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xs)] overflow-hidden">
            {/* Header row */}
            <div className="hidden sm:flex items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] select-none">
              <span className="flex-1 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[var(--color-text-faint)]" />
                Document Record
              </span>
              <span className="w-36">Status</span>
              <span className="w-28">Obligations</span>
              <span className="hidden lg:block w-28">Uploaded</span>
              <span className="w-8 shrink-0 text-right">View</span>
            </div>

            {isLoading && (
              <div className="divide-y divide-[var(--color-border)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <ContractCardSkeleton key={i} />
                ))}
              </div>
            )}

            {!isLoading && isEmpty && (
              <div className="p-6 sm:p-8">
                <EmptyState
                  size="default"
                  icon={FileText}
                  title={hasActiveFilters ? 'No contracts match your criteria' : 'Contract repository is empty'}
                  description={
                    hasActiveFilters
                      ? 'Try clearing the search query or changing your status filter options.'
                      : 'Use the Upload contract action above to add your first PDF and extract obligations, deadlines, and key terms.'
                  }
                  action={
                    hasActiveFilters ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setStatus(undefined);
                          setSearch('');
                        }}
                      >
                        <Filter className="h-3.5 w-3.5" />
                        Clear all filters
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            )}

            {!isLoading && data && data.contracts.length > 0 && (
              <StaggerContainer
                staggerDelay={0.035}
                delayChildren={0.04}
                className="divide-y divide-[var(--color-border)]"
              >
                {data.contracts.map((contract) => (
                  <StaggerItem key={contract.id}>
                    <ContractCard contract={contract} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        </FadeUp>
      )}

      {!isError && !isLoading && data && data.contracts.length > 0 && (
        <PaginationBar pagination={data.pagination} onPageChange={setPage} />
      )}
    </PageTransition>
  );
}
