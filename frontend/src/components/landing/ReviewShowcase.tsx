import { Check, Clock, ShieldCheck } from 'lucide-react';
import { Reveal } from './Reveal';
import { SectionHeading } from './SectionHeading';

const ROWS = [
  { title: 'Deliver monthly usage report', status: 'Confirmed', tone: 'success' as const },
  { title: 'Pay invoice within 30 days', status: 'Confirmed', tone: 'success' as const },
  { title: 'Renew insurance certificate', status: 'Needs review', tone: 'warning' as const },
];

export function ReviewShowcase() {
  return (
    <section className="bg-[var(--color-bg)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--color-text-primary)]" />
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Obligation review</p>
              </div>
              <ul className="mt-4 divide-y divide-[var(--color-border)]">
                {ROWS.map((row) => (
                  <li key={row.title} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                      {row.tone === 'success' ? (
                        <Check className="h-4 w-4 text-[var(--color-success)]" />
                      ) : (
                        <Clock className="h-4 w-4 text-[var(--color-warning)]" />
                      )}
                      {row.title}
                    </span>
                    <span
                      className={
                        row.tone === 'success'
                          ? 'rounded-full bg-[var(--color-success-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-success)]'
                          : 'rounded-full bg-[var(--color-warning-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-warning)]'
                      }
                    >
                      {row.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <SectionHeading
            align="left"
            eyebrow="Human review"
            title="Confirmed means confirmed by you"
            description="AI output starts as a suggestion. It stays that way until you explicitly confirm it — full stop. Edited fields and the original AI reasoning are both kept, so nothing gets lost."
            className="order-1 lg:order-2"
          />
        </div>
      </div>
    </section>
  );
}
