import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Button } from '@/components/ui/Button';

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#trust', label: 'Security' },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" variant="accent">
            <Link to="/register">Get started</Link>
          </Button>
        </div>

        <button
          className="rounded-[var(--radius-sm)] p-2 text-[var(--color-text-primary)] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3" aria-label="Primary mobile">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-[var(--color-text-muted)]"
              >
                {link.label}
              </a>
            ))}
          <div className="mt-2 flex items-center justify-between gap-2">
            <ThemeToggle compact />
          </div>
          <div className="mt-2 flex flex-col gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link to="/login">Sign in</Link>
              </Button>
            <Button asChild size="sm" variant="accent">
              <Link to="/register">Get started</Link>
            </Button>
          </div>
        </nav>
      </div>
      )}
    </header>
  );
}
