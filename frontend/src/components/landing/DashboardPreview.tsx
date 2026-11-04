import { FileText, ListChecks, AlarmClock } from 'lucide-react';
import { Reveal } from './Reveal';
import { SectionHeading } from './SectionHeading';

const STATS = [
  { label: 'Contracts', value: '24', icon: FileText },
  { label: 'Active obligations', value: '61', icon: ListChecks },
  { label: 'Overdue', value: '2', icon: AlarmClock },
];

export function DashboardPreview() {
  return (
    <section className="bg-[var(--color-bg)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Command center"
          title="One dashboard for every contract you're responsible for"
          description="Real counts, real deadlines, real status — pulled live from your account."
        />
        <Reveal delay={0.1} className="mt-14">
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-navy)] px-5 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-surface)]/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-surface)]/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-surface)]/30" />
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3 sm:p-8">
              {STATS.map((stat) => (
                <div key={stat.label} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--color-text-muted)]">{stat.label}</p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-navy)]/5">
                      <stat.icon className="h-4 w-4 text-[var(--color-text-primary)]" />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-[var(--color-text-primary)]">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
