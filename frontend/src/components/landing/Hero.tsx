import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const rise = (delay: number) =>
    shouldReduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className="bg-[var(--color-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <motion.div {...rise(0)} className="mx-auto flex max-w-2xl justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-primary)] shadow-[var(--shadow-xs)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-orange)]" />
            AI-assisted, human-reviewed
          </span>
        </motion.div>

        <motion.h1
          {...rise(0.08)}
          className="mx-auto mt-6 max-w-3xl text-center text-4xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-5xl"
        >
          Every obligation buried in your contracts, surfaced before it's missed.
        </motion.h1>

        <motion.p
          {...rise(0.16)}
          className="mx-auto mt-6 max-w-xl text-center text-lg leading-relaxed text-[var(--color-text-muted)]"
        >
          ClauseGuard reads your contracts, drafts a list of obligations and deadlines, and lets you
          confirm what's real. Nothing becomes binding until you say so.
        </motion.p>

        <motion.div {...rise(0.24)} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" variant="accent">
            <Link to="/register">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <a href="#how-it-works">See how it works</a>
          </Button>
        </motion.div>

        <motion.div
          {...rise(0.32)}
          className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 text-xs text-[var(--color-text-faint)]"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Every AI suggestion is reviewed by you before it's confirmed — never legal advice.
        </motion.div>
      </div>
    </section>
  );
}
