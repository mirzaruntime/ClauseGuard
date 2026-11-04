import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <Link to="/">
          <Logo />
        </Link>
        <p className="max-w-md text-center text-xs leading-relaxed text-[var(--color-text-faint)] sm:text-right">
          ClauseGuard's AI analysis is an assistive extraction layer, not legal advice. Every obligation
          requires human review.
        </p>
      </div>
      <p className="mt-6 text-center text-xs text-[var(--color-text-faint)]">
        © {new Date().getFullYear()} ClauseGuard. All rights reserved.
      </p>
    </footer>
  );
}
