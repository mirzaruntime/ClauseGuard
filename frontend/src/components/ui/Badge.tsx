import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-normal whitespace-nowrap border transition-all duration-150 select-none shadow-[0_1px_2px_rgba(15,23,42,0.02)]',
  {
    variants: {
      tone: {
        neutral: 'bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] border-[var(--color-border)]',
        navy: 'bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] border-[var(--color-border)]',
        blue: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info-border)]',
        success: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
        warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
        danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
        orange: 'bg-[var(--color-orange-subtle)] text-[var(--color-orange-text)] border-[var(--color-orange)]/25',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
}
