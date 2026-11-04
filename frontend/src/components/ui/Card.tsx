import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'glass' | 'ai' | 'subtle';
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  const variantClasses = {
    default:
      'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xs)]',
    interactive:
      'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xs)] interactive-card cursor-pointer',
    glass:
      'rounded-[var(--radius-lg)] glass-panel',
    ai:
      'rounded-[var(--radius-lg)] border border-[var(--color-border)] border-l-[3px] border-l-[var(--color-orange)] bg-[var(--color-surface)] shadow-[var(--shadow-xs)]',
    subtle:
      'rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)]/70',
  }[variant];

  return <div className={cn(variantClasses, className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-4 sm:p-5 pb-0 sm:pb-0', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-sm sm:text-base font-semibold tracking-tight text-[var(--color-text-primary)]', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 sm:p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 p-4 sm:p-5 pt-3 sm:pt-4 border-t border-[var(--color-border)] bg-[var(--color-surface-subtle)]/30 rounded-b-[var(--radius-lg)]',
        className,
      )}
      {...props}
    />
  );
}
