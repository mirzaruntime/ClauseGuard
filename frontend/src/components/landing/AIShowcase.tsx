import { Sparkles, Quote } from 'lucide-react';
import { Reveal } from './Reveal';
import { SectionHeading } from './SectionHeading';

export function AIShowcase() {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <SectionHeading
            align="left"
            eyebrow="AI analysis"
            title="Every suggestion comes with its receipts"
            description="ClauseGuard doesn't just tell you an obligation exists — it shows the exact clause it came from, how confident the model is, and why it matters. You're never reviewing a black box."
          />
          <Reveal delay={0.1}>
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-orange)]/25 bg-[var(--color-bg)] p-6 shadow-[var(--shadow-md)]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--color-orange-text)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI suggestion
                </span>
                <span className="text-xs font-medium text-[var(--color-success)]">87% confidence</span>
              </div>
              <h4 className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">
                Provide 30 days' written notice before renewal
              </h4>
              <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
                The customer must notify the supplier in writing at least 30 days before the current term ends.
              </p>
              <blockquote className="mt-3 border-l-2 border-[var(--color-orange)] bg-[var(--color-surface)] py-2 pl-3 text-xs italic text-[var(--color-text)]">
                <Quote className="mb-1 h-3 w-3 rotate-180 text-[var(--color-orange)]" />
                "Either party may terminate on sixty (60) days written notice prior to renewal."
              </blockquote>
              <div className="mt-4 flex gap-2">
                <span className="rounded-[var(--radius-sm)] bg-[var(--color-navy)] px-3 py-1.5 text-xs font-medium text-white">
                  Confirm
                </span>
                <span className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)]">
                  Edit
                </span>
                <span className="rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)]">
                  Reject
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
