import * as React from 'react';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[11rem] overflow-hidden rounded-[var(--radius-lg)] glass-dropdown p-1.5 shadow-[var(--shadow-glass)]',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-150',
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs sm:text-sm text-[var(--color-text-primary)] font-medium outline-none transition-colors',
        'data-[highlighted]:bg-[var(--color-navy)] data-[highlighted]:text-white data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
        className,
      )}
      {...props}
    />
  );
}

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownPrimitive.CheckboxItem
    ref={ref}
    checked={checked}
    className={cn(
      'relative flex cursor-pointer select-none items-center gap-2.5 rounded-[var(--radius-sm)] py-1.5 pl-8 pr-2.5 text-xs sm:text-sm text-[var(--color-text-primary)] font-medium outline-none transition-colors',
      'data-[highlighted]:bg-[var(--color-navy)] data-[highlighted]:text-white',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
      <DropdownPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5" />
      </DropdownPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>) {
  return (
    <DropdownPrimitive.Label
      className={cn('px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-faint)] tracking-wider uppercase', className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>) {
  return (
    <DropdownPrimitive.Separator
      className={cn('-mx-1 my-1 h-px bg-[var(--color-border)]', className)}
      {...props}
    />
  );
}
