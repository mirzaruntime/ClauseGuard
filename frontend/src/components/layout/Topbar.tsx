import { useLocation } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Shield } from 'lucide-react';

const ROUTE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/contracts': 'Contracts Repository',
  '/contracts/upload': 'Upload Contract',
  '/obligations': 'Obligations Tracker',
  '/reminders': 'Reminders Schedule',
  '/settings': 'Workspace Settings',
};

export function Topbar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const pageName =
    ROUTE_NAMES[currentPath] ??
    (currentPath.startsWith('/contracts/') ? 'Contract Inspection' : 'Workspace');

  return (
    <header className="sticky top-0 z-30 flex h-15 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="lg:hidden">
          <Logo iconOnly />
        </div>
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <span className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-[var(--color-text-primary)]" />
            ClauseGuard
          </span>
          <span className="text-[var(--color-border-strong)]">/</span>
          <span className="font-medium text-[var(--color-text-muted)]">{pageName}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle compact />
        <UserMenu />
      </div>
    </header>
  );
}
