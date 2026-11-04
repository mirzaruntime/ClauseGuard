import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';
import { cn } from '@/lib/utils';

/** Fixed bottom tab bar for small screens — replaces the sidebar under lg. */
export function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_-2px_8px_rgba(23,40,59,0.05)] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors select-none',
              isActive
                ? 'text-[var(--color-text-primary)] font-semibold'
                : 'text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                className={cn(
                  'h-4.5 w-4.5 transition-colors',
                  isActive ? 'text-[var(--color-orange)]' : 'text-[var(--color-text-faint)]',
                )}
              />
              <span className="truncate max-w-[64px]">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
