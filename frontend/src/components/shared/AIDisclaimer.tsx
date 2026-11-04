import { Sparkles } from 'lucide-react';

export function AIDisclaimer({ text }: { text?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-orange)]/30 bg-[var(--color-orange-subtle)] p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(255,87,34,0.04)]">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-orange)]/15 text-[var(--color-orange-text)] shrink-0 mt-0.5">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
            Human-in-the-Loop Protocol
          </p>
        </div>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)] leading-relaxed">
          {text ??
            'AI extractions are assistive suggestions. No item is a binding tracked obligation until you confirm or edit it below.'}
        </p>
      </div>
    </div>
  );
}
