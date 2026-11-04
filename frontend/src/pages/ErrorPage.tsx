import { Link } from 'react-router-dom';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ErrorPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 text-center">
      <div className="relative z-10 max-w-md rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)] sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger-border)] shadow-xs mb-4">
          <AlertOctagon className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Application Error
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
          An unexpected exception occurred during execution. You can reload the application runtime or return to your dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => window.location.reload()} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reload window
          </Button>
          <Button asChild variant="primary">
            <Link to="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
