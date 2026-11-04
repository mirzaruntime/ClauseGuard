import { Link } from 'react-router-dom';
import { ShieldAlert, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function UnauthorizedPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 text-center">
      <div className="relative z-10 max-w-md rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)] sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger-border)] shadow-xs mb-4">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Session Expired
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
          Your workspace security session has expired or requires re-authentication. Please sign in to resume.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="primary">
            <Link to="/login">
              <LogIn className="h-4 w-4 mr-1.5" />
              Sign in to ClauseGuard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
