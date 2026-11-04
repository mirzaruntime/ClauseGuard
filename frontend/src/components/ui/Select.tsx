import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-9 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-control-border)] bg-[var(--color-surface)] px-3 text-xs sm:text-sm text-[var(--color-text-primary)] font-medium shadow-[0_1px_2px_rgba(15,23,42,0.03)] cursor-pointer transition-all duration-150',
      'hover:border-[var(--color-border-strong)] focus-visible:border-[var(--color-focus)] focus-visible:ring-3 focus-visible:ring-[var(--color-focus)]/20 data-[disabled]:text-[var(--color-disabled)] data-[disabled]:opacity-100 data-[disabled]:cursor-not-allowed',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-faint)] transition-transform duration-150" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

export function SelectContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          'z-50 overflow-hidden rounded-[var(--radius-lg)] glass-dropdown shadow-[var(--shadow-glass)]',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150',
          className,
        )}
        position="popper"
        sideOffset={5}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-[var(--radius-sm)] py-1.5 pl-7 pr-2.5 text-xs sm:text-sm text-[var(--color-text-primary)] font-medium outline-none transition-colors',
        'data-[highlighted]:bg-[var(--color-navy)] data-[highlighted]:text-white data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-3.5 w-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectLabel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn('px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-faint)] tracking-wider uppercase', className)}
      {...props}
    />
  );
}

export function SelectSeparator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn('-mx-1 my-1 h-px bg-[var(--color-border)]', className)}
      {...props}
    />
  );
}
