import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className, iconOnly }: { className?: string; iconOnly?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-navy)] text-white shadow-[0_2px_8px_rgba(11,30,45,0.25)] border border-white/10">
        <ShieldCheck className="h-4 w-4 text-white" strokeWidth={2.25} />
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--color-orange)] ring-2 ring-white" />
      </span>
      {!iconOnly && (
        <div className="flex items-baseline gap-1">
          <span className="text-[16px] font-bold tracking-tight text-[var(--color-text-primary)]">
            Clause<span className="text-[var(--color-orange)]">Guard</span>
          </span>
        </div>
      )}
    </div>
  );
}
