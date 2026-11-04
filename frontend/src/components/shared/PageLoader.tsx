import { HungrySquidLoader } from '@/components/ui/HungrySquidLoader';

export function PageLoader({
  label = 'Loading workspace…',
  sublabel = 'Preparing contract obligations and data',
}: {
  label?: string;
  sublabel?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-md)]">
        <HungrySquidLoader size="md" label={label} sublabel={sublabel} />
      </div>
    </div>
  );
}
