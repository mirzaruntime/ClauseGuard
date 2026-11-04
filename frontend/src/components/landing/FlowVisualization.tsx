import { ArrowRight, FileText, ListChecks, Sparkles } from 'lucide-react';
import { Reveal } from './Reveal';
import { SectionHeading } from './SectionHeading';

const STEPS = [
  { icon: FileText, title: 'Contract', desc: 'You upload a PDF' },
  { icon: Sparkles, title: 'AI analysis', desc: 'Obligations are extracted' },
  { icon: ListChecks, title: 'Your review', desc: 'You confirm, edit or reject' },
];

export function FlowVisualization() {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How the data flows"
          title="AI tells you what a contract says. You decide what to do about it."
          description="ClauseGuard never treats an AI suggestion as final. It's a starting point for your review, not a replacement for it."
        />

        <Reveal delay={0.1} className="mt-14">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex items-center gap-3 sm:gap-3">
                <div className="flex w-40 flex-col items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-6 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-navy)] text-white">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{step.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden h-5 w-5 shrink-0 text-[var(--color-text-faint)] sm:block" />
                )}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
