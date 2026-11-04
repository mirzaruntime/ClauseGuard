import { FileSearch, ListChecks, BellRing, Gauge, FolderClock, Quote } from 'lucide-react';
import { Reveal } from './Reveal';
import { SectionHeading } from './SectionHeading';

const FEATURES = [
  { icon: FileSearch, title: 'Automatic extraction', desc: 'Upload a PDF and get a structured list of obligations, parties and a plain-language summary.' },
  { icon: Quote, title: 'Source-linked suggestions', desc: 'Every AI suggestion links back to the exact clause it was drawn from.' },
  { icon: ListChecks, title: 'Explicit review workflow', desc: 'Confirm, edit or reject — obligations only become active by your decision.' },
  { icon: Gauge, title: 'Confidence scoring', desc: 'Each suggestion carries a calibrated confidence score so you know where to look closest.' },
  { icon: BellRing, title: 'Scheduled reminders', desc: 'Set a reminder once; delivery is handled by the backend scheduler, reliably.' },
  { icon: FolderClock, title: 'Full contract history', desc: 'Every contract keeps its processing status, analysis errors and obligation history.' },
];

export function Features() {
  return (
    <section id="features" className="bg-[var(--color-surface)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Features" title="Everything you need to stay on top of your contracts" />
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 3) * 0.06}>
              <div className="h-full rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6 transition-shadow hover:shadow-[var(--shadow-md)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-blue)]/8">
                  <feature.icon className="h-5 w-5 text-[var(--color-link)]" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-[var(--color-text-primary)]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{feature.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
