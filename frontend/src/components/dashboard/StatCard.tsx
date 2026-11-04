import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
  hint?: string;
}) {
  const toneIconStyles = {
    neutral: 'bg-[var(--color-surface-subtle)] text-[var(--color-text-primary)] border-[var(--color-border)]',
    warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
    danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
    success: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
  }[tone];

  const toneBarStyles = {
    neutral: 'bg-[var(--color-navy)]',
    warning: 'bg-[var(--color-orange)]',
    danger: 'bg-[var(--color-danger)]',
    success: 'bg-[var(--color-success)]',
  }[tone];

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4.5 sm:p-5 shadow-[var(--shadow-xs)] interactive-card flex flex-col justify-between">
      {/* Subtle top indicator stripe (reference: JohnnyCSilva/quick-chicken-16) */}
      <span className={cn('absolute top-0 inset-x-0 h-0.75', toneBarStyles)} aria-hidden="true" />

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-faint)] truncate">
          {label}
        </p>
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-xs transition-transform duration-150 group-hover:scale-105',
            toneIconStyles,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="mt-3">
        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] leading-none">
          {value}
        </p>
        {hint && (
          <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)] truncate font-medium" title={hint}>
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
