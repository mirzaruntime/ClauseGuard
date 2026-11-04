import { Skeleton } from '@/components/ui/Skeleton';

export function ContractCardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:py-3.5">
      <Skeleton className="h-8 w-8 rounded-[var(--radius-sm)] shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/4 sm:hidden" />
      </div>
      <Skeleton className="hidden sm:block h-6 w-28 rounded-full shrink-0" />
      <Skeleton className="hidden sm:block h-4 w-20 shrink-0" />
      <Skeleton className="hidden md:block h-4 w-20 shrink-0" />
      <Skeleton className="hidden lg:block h-4 w-20 shrink-0" />
      <Skeleton className="h-4 w-4 rounded-full shrink-0" />
    </div>
  );
}
