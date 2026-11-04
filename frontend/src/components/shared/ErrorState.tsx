import { AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ErrorState({
  message,
  isNetworkError,
  onRetry,
}: {
  message: string;
  isNetworkError?: boolean;
  onRetry?: () => void;
}) {
  const Icon = isNetworkError ? WifiOff : AlertTriangle;
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-8 sm:p-10 text-center shadow-[var(--shadow-xs)]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-danger-bg)] text-[var(--color-danger)] mb-3.5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm sm:text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
          {isNetworkError ? 'Connection interrupted' : 'Something went wrong'}
        </h3>
        <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
          {message}
        </p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-5 gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
