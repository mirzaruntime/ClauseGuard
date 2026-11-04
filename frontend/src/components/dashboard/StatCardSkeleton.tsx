import { Skeleton } from '@/components/ui/Skeleton';

export function StatCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-[var(--radius-sm)]" />
      </div>
      <Skeleton className="mt-3 h-8 w-16" />
    </div>
  );
}
