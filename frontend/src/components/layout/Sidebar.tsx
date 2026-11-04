import { NavLink, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Logo } from './Logo';
import { NAV_ITEMS } from './navItems';
import { cn } from '@/lib/utils';

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:flex select-none z-20">
      {/* Top Header */}
      <div className="flex h-15 items-center justify-between px-5 border-b border-[var(--color-border)]">
        <Link to="/dashboard" className="transition-opacity hover:opacity-90">
          <Logo />
        </Link>
        <span className="rounded-full bg-[var(--color-surface-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-wider border border-[var(--color-border)]">
          SaaS
        </span>
      </div>



      {/* Navigation List */}
      <div className="px-3 pt-2 pb-1">
        <p className="px-3 text-[11px] font-semibold tracking-wider text-[var(--color-text-faint)] uppercase">
          Workspace
        </p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-1" aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[var(--color-navy)] text-white shadow-[0_2px_8px_rgba(11,30,45,0.15)] font-semibold'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-primary)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-[var(--color-orange-light)]' : 'text-[var(--color-text-faint)] group-hover:text-[var(--color-text-primary)]',
                  )}
                />
                <span className="truncate">{label}</span>
                {isActive && (
                  <span className="absolute right-2.5 h-1.5 w-1.5 rounded-full bg-[var(--color-orange)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Legal Notice */}
      <div className="border-t border-[var(--color-border)] p-3.5 bg-[var(--color-surface-subtle)]/40">
        <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-2.5 border border-[var(--color-border)] shadow-[var(--shadow-xs)]">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-3.5 w-3.5 text-[var(--color-text-faint)] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-text-primary)]">Legal notice:</span> AI assistance supports review; human approval is required for binding obligations.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
