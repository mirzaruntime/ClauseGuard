import { Reveal } from './Reveal';
import { cn } from '@/lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
}) {
  return (
    <Reveal className={cn(align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl', className)}>
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-orange-text)]">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-[var(--color-text-muted)]">{description}</p>
      )}
    </Reveal>
  );
}
