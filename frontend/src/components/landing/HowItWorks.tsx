import { Reveal } from './Reveal';
import { SectionHeading } from './SectionHeading';

const STEPS = [
  {
    number: '01',
    title: 'Upload your contract',
    description: 'Drag in a PDF. ClauseGuard extracts the text and validates it before anything else happens.',
  },
  {
    number: '02',
    title: 'AI drafts the obligations',
    description:
      'Each potential obligation comes with its source clause, a confidence score and a plain-language explanation.',
  },
  {
    number: '03',
    title: 'You confirm, edit or reject',
    description: 'Nothing becomes a tracked obligation until you\u2019ve reviewed it. Edits are yours to make.',
  },
  {
    number: '04',
    title: 'Deadlines and reminders track themselves',
    description: 'Confirmed obligations get deadline tracking and scheduled reminders, so nothing slips through.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[var(--color-bg)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="How it works" title="From PDF to tracked obligation in four steps" />

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.08}>
              <div className="border-t-2 border-[var(--color-navy)] pt-5">
                <span className="text-xs font-semibold text-[var(--color-orange-text)]">{step.number}</span>
                <h3 className="mt-2 text-base font-semibold text-[var(--color-text-primary)]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
