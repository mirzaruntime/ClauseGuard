import * as React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--color-control-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
      'placeholder:text-[var(--color-text-faint)] transition-all duration-150 resize-y',
      'focus-visible:border-[var(--color-focus)] focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]/20',
      'disabled:cursor-not-allowed disabled:text-[var(--color-disabled)] disabled:opacity-100 disabled:bg-[var(--color-bg)]',
      'aria-[invalid=true]:border-[var(--color-danger)] aria-[invalid=true]:focus-visible:ring-[var(--color-danger)]/15',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
