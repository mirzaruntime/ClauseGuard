import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Pagination as PaginationType } from '@/types/api';

export function PaginationBar({
  pagination,
  onPageChange,
}: {
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-[var(--color-border)] px-1 pt-4">
      <p className="text-sm text-[var(--color-text-muted)]">
        Page <span className="font-medium text-[var(--color-text-primary)]">{pagination.page}</span> of{' '}
        {pagination.totalPages} · {pagination.total} total
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasNextPage}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
