import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryContent?: ReactNode;
  size?: 'compact' | 'default' | 'page';
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryContent,
  size = 'default',
  className,
}: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();

  const containerPadding =
    size === 'compact'
      ? 'py-6 px-4'
      : size === 'page'
        ? 'py-10 sm:py-14 px-6'
        : 'py-8 sm:py-10 px-5';

  const iconBoxSize =
    size === 'compact'
      ? 'h-10 w-10 rounded-xl mb-2.5'
      : size === 'page'
        ? 'h-14 w-14 rounded-2xl mb-4'
        : 'h-12 w-12 rounded-xl mb-3';

  const iconSize =
    size === 'compact'
      ? 'h-5 w-5'
      : size === 'page'
        ? 'h-7 w-7'
        : 'h-6 w-6';

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative overflow-hidden flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] text-center',
        containerPadding,
        className,
      )}
    >
      <motion.div
        initial={shouldReduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.92, opacity: 0 }}
        animate={shouldReduceMotion ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.22, delay: 0.04 }}
        className={cn(
          'relative flex items-center justify-center bg-[var(--color-navy)]/5 border border-[var(--color-navy)]/10 text-[var(--color-text-primary)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]',
          iconBoxSize,
        )}
      >
        <Icon className={iconSize} />
      </motion.div>

      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.08 }}
        className="max-w-md space-y-1 text-center"
      >
        <h3
          className={cn(
            'font-semibold tracking-tight text-[var(--color-text-primary)]',
            size === 'compact' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base',
          )}
        >
          {title}
        </h3>
        {description && (
          <p
            className={cn(
              'text-[var(--color-text-muted)] leading-relaxed mx-auto',
              size === 'compact'
                ? 'text-[11px] sm:text-xs max-w-xs'
                : 'text-xs sm:text-sm max-w-sm',
            )}
          >
            {description}
          </p>
        )}
      </motion.div>

      {action && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.14 }}
          className={cn(size === 'compact' ? 'mt-3.5' : 'mt-5')}
        >
          {action}
        </motion.div>
      )}

      {secondaryContent && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1 }}
          transition={{ duration: 0.22, delay: 0.18 }}
          className="mt-6 w-full max-w-md pt-5 border-t border-[var(--color-border)]"
        >
          {secondaryContent}
        </motion.div>
      )}
    </motion.div>
  );
}
