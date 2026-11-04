import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme, type ThemePreference } from '@/hooks/useTheme';

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme preference"
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-xs)]',
        className,
      )}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const isActive = value === theme;

        return (
          <button
            key={value}
            type="button"
            aria-label={`Set theme to ${label}`}
            aria-pressed={isActive}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]',
              isActive
                ? 'bg-[var(--color-navy)] text-white shadow-[var(--shadow-xs)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]',
              compact && 'min-h-8 min-w-8 px-2',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {!compact && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
