import { Lock, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';
import { Reveal } from './Reveal';

const ITEMS = [
  { icon: Lock, title: 'Encrypted credentials', desc: 'Passwords are hashed, never stored or logged in plain text.' },
  { icon: KeyRound, title: 'Token-based sessions', desc: 'Access is scoped to your account through short-lived, signed tokens.' },
  { icon: UserCheck, title: 'Private by default', desc: 'Your contracts and obligations are visible only to your account.' },
  { icon: ShieldCheck, title: 'Human-in-the-loop AI', desc: 'AI output is assistive analysis only — never presented as legal advice.' },
];

export function TrustSecurity() {
  return (
    <section id="trust" className="border-y border-[var(--color-border)] bg-[var(--color-navy)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-orange)]">
            Trust &amp; security
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Built to be trusted with contracts you can't afford to get wrong
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.06}>
              <div className="h-full rounded-[var(--radius-lg)] border border-white/10 bg-[var(--color-surface)]/5 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface)]/10">
                  <item.icon className="h-5 w-5 text-white" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
