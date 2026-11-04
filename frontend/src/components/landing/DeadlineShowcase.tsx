import { BellRing } from 'lucide-react';
import { Reveal } from './Reveal';
import { SectionHeading } from './SectionHeading';

const ITEMS = [
  { label: 'Insurance certificate renewal', date: 'Due in 4 days', tone: 'warning' as const },
  { label: 'Quarterly compliance report', date: 'Due in 18 days', tone: 'info' as const },
  { label: 'Vendor invoice payment', date: 'Overdue by 2 days', tone: 'danger' as const },
];

const TONE_DOT: Record<string, string> = {
  warning: 'bg-[var(--color-warning)]',
  info: 'bg-[var(--color-info)]',
  danger: 'bg-[var(--color-danger)]',
};
const TONE_TEXT: Record<string, string> = {
  warning: 'text-[var(--color-warning)]',
  info: 'text-[var(--color-text)]',
  danger: 'text-[var(--color-danger)]',
};

export function DeadlineShowcase() {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <SectionHeading
            align="left"
            eyebrow="Deadlines & reminders"
            title="Know what's due before it's urgent"
            description="Confirmed obligations carry their deadlines forward automatically. Schedule a reminder once, and ClauseGuard's scheduler handles delivery — no spreadsheet required."
          />
          <Reveal delay={0.1}>
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-[var(--shadow-md)]">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-[var(--color-text-primary)]" />
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Upcoming deadlines</p>
              </div>
              <ul className="mt-4 space-y-3">
                {ITEMS.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3.5 py-3">
                    <span className="text-sm text-[var(--color-text-primary)]">{item.label}</span>
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${TONE_TEXT[item.tone]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[item.tone]}`} />
                      {item.date}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
