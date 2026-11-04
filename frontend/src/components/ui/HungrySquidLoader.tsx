import { cn } from '@/lib/utils';

export interface HungrySquidLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  sublabel?: string;
  className?: string;
}

/**
 * Hungry Squid 3D Flip Book Loader — adapted for ClauseGuard.
 * Reference: Uiverse.io anand_4957/hungry-squid-53
 *
 * Simulates real contract document pages flipping in 3D perspective
 * with simulated clause lines and depth shadows.
 */
export function HungrySquidLoader({
  size = 'md',
  label,
  sublabel,
  className,
}: HungrySquidLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center select-none',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn('cg-book-loader', `size-${size}`)} aria-hidden="true">
        <div className="cg-book-cover" />
        <div className="cg-book-static-left" />
        <div className="cg-book-static-right" />
        <div className="cg-book-shadow" />
        <div className="cg-book-flip page-1" />
        <div className="cg-book-flip page-2" />
        <div className="cg-book-flip page-3" />
      </div>

      {(label || sublabel) && (
        <div className="space-y-0.5">
          {label && (
            <p className="text-xs sm:text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
              {label}
            </p>
          )}
          {sublabel && (
            <p className="text-[11px] sm:text-xs text-[var(--color-text-muted)] max-w-xs mx-auto">
              {sublabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
