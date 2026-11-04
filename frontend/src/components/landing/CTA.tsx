import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal } from './Reveal';
import { Button } from '@/components/ui/Button';

export function CTA() {
  return (
    <section className="bg-[var(--color-bg)] py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="rounded-[var(--radius-xl)] bg-[var(--color-navy)] px-8 py-14 text-center sm:px-16">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Stop finding out about deadlines the hard way
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/70">
              Upload your first contract in under a minute. No credit card required.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" variant="accent">
                <Link to="/register">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
