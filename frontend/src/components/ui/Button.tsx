import * as React from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Enterprise button component adapted from curated Uiverse interactions:
 * - MuhammadHasann/silent-lizard-44 (sheen / crisp inner edge)
 * - AKAspidey01/orange-donkey-78 (electric orange hover depth)
 * - Ali-Tahmazi99/big-stingray-4 (obsidian reflection)
 * - vinodjangid07/smart-emu-83 (directional icon micro-motion)
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium transition-all duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 select-none cursor-pointer [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-150',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-light)] active:bg-[var(--color-navy-dark)] shadow-[var(--shadow-xs)]',
        accent:
          'bg-[var(--color-orange-action)] text-white hover:bg-[var(--color-orange-dark)] active:bg-[var(--color-orange-dark)] shadow-[var(--shadow-xs)]',
        secondary:
          'bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-control-border)] hover:bg-[var(--color-surface-subtle)] hover:border-[var(--color-navy)] shadow-[var(--shadow-xs)]',
        glass:
          'glass-panel text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] hover:border-[var(--color-border-strong)]',
        ghost:
          'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-subtle)] active:bg-[var(--color-border-subtle)]',
        outline:
          'border border-[var(--color-control-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] hover:border-[var(--color-navy)]',
        danger:
          'bg-[var(--color-danger)] text-white hover:bg-red-700 shadow-[var(--shadow-xs)]',
        link:
          'text-[var(--color-link)] underline-offset-4 hover:underline p-0 h-auto active:scale-100',
      },
      size: {
        sm: 'h-8 px-2.5 text-xs font-medium gap-1.5 [&_svg]:size-3.5',
        md: 'h-9 px-3.5 text-sm font-medium',
        lg: 'h-10 px-5 text-sm font-medium gap-2.5',
        xl: 'h-12 px-6 text-base font-semibold gap-2.5',
        icon: 'h-9 w-9 p-0',
        'icon-sm': 'h-8 w-8 p-0 [&_svg]:size-3.5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, isLoading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin" aria-hidden="true" />}
        <Slottable>{children}</Slottable>
      </Comp>
    );
  },
);
Button.displayName = 'Button';
