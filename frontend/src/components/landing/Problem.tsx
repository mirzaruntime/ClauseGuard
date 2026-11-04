import { FileWarning, Hourglass, Search } from 'lucide-react';
import { Reveal } from './Reveal';
import { SectionHeading } from './SectionHeading';

const POINTS = [
  {
    icon: Search,
    title: 'Obligations hide in plain text',
    description:
      'Renewal windows, notice periods and payment terms are scattered across dozens of pages, in language built for lawyers, not calendars.',
  },
  {
    icon: Hourglass,
    title: 'Deadlines slip past unnoticed',
    description:
      'Without a system tracking them, a 30-day notice clause or an auto-renewal date is easy to miss until it costs you.',
  },
  {
    icon: FileWarning,
    title: 'Manual review doesn\u2019t scale',
    description:
      'Re-reading every contract by hand works for one agreement. It falls apart the moment you\u2019re managing dozens.',
  },
];

export function Problem() {
  return (
    <section className="bg-[var(--color-bg)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The problem"
          title="Contracts are full of commitments no one is tracking"
          description="Most teams find out about a missed obligation after it's already a problem."
        />
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {POINTS.map((point, i) => (
            <Reveal key={point.title} delay={i * 0.08}>
              <div className="h-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-danger-bg)]">
                  <point.icon className="h-5 w-5 text-[var(--color-danger)]" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {point.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
