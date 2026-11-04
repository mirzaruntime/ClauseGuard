import { Quote } from 'lucide-react';

export function SourceClauseViewer({ clause }: { clause: string | null }) {
  if (!clause) {
    return <p className="text-xs italic text-[var(--color-text-faint)]">No source clause captured from document text.</p>;
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-subtle)]/70 p-3 sm:p-3.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-text-primary)] mb-1.5 uppercase tracking-wider">
        <Quote className="h-3 w-3 shrink-0 text-[var(--color-orange)]" />
        <span>Original contract clause excerpt</span>
      </div>
      <blockquote className="text-xs sm:text-sm italic leading-relaxed text-[var(--color-text-primary)] border-l-2 border-[var(--color-orange)] pl-3 my-0.5">
        &ldquo;{clause}&rdquo;
      </blockquote>
    </div>
  );
}
