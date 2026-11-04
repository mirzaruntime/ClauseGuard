import { cn } from '@/lib/utils';
import { formatConfidence } from '@/lib/format';

export function ConfidenceMeter({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null;
  const percent = Math.round(confidence * 100);
  const toneBg =
    percent >= 75
      ? 'bg-[var(--color-success)]'
      : percent >= 45
        ? 'bg-[var(--color-warning)]'
        : 'bg-[var(--color-danger)]';

  const toneText =
    percent >= 75
      ? 'text-[var(--color-success)]'
      : percent >= 45
        ? 'text-[var(--color-warning)]'
        : 'text-[var(--color-danger)]';

  return (
    <div className="flex items-center gap-2 select-none" title={`AI Confidence Score: ${percent}%`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--color-surface-subtle)] shadow-[inset_0_1px_1px_rgba(0,0,0,0.06)]">
        <div
          className={cn('h-full rounded-full transition-all duration-300', toneBg)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={cn('text-[11px] font-semibold', toneText)}>
        {formatConfidence(confidence)} AI confidence
      </span>
    </div>
  );
}
