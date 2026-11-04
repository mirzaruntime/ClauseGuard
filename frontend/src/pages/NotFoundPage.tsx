import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] px-4 text-center">
      <div className="relative z-10 max-w-md rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)] sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-navy)]/5 text-[var(--color-text-primary)] border border-[var(--color-navy)]/10 shadow-xs mb-4">
          <FileQuestion className="h-7 w-7 text-[var(--color-text-primary)]/70" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Page Not Found
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
          The requested document or workspace route does not exist or has been relocated.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="primary">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Return to Workspace
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
