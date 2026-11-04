import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-9.5 w-full rounded-[var(--radius-md)] border border-[var(--color-control-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
        'placeholder:text-[var(--color-text-faint)] transition-all duration-150',
        'focus-visible:border-[var(--color-focus)] focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]/20',
        'disabled:cursor-not-allowed disabled:text-[var(--color-disabled)] disabled:opacity-100 disabled:bg-[var(--color-bg)]',
        'aria-[invalid=true]:border-[var(--color-danger)] aria-[invalid=true]:focus-visible:ring-[var(--color-danger)]/15',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
