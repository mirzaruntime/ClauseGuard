import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)] p-1 border border-[var(--color-border)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.03)]',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3.5 py-1.5 text-xs sm:text-sm font-medium text-[var(--color-text-muted)] transition-all duration-150 cursor-pointer select-none',
        'data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-text-primary)] data-[state=active]:font-semibold data-[state=active]:shadow-[0_1px_3px_rgba(15,23,42,0.08)] data-[state=active]:border-[var(--color-border)]',
        'hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('mt-4 focus-visible:outline-none data-[state=inactive]:hidden', className)}
      {...props}
    />
  );
}
