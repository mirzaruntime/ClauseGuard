import { useEffect, type ReactNode } from 'react';

/**
 * Global subtle cursor spotlight listener.
 * Efficiently streams cursor position into CSS variables (--mouse-x, --mouse-y)
 * on documentElement using requestAnimationFrame without triggering React re-renders.
 * Automatically disabled on touch screens and prefers-reduced-motion.
 */
export function CursorSpotlight({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Check if the user has fine pointer and motion enabled
    if (typeof window === 'undefined') return;
    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!hasFinePointer || prefersReducedMotion) return;

    let rafId: number | null = null;
    let targetX = -500;
    let targetY = -500;

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          document.documentElement.style.setProperty('--mouse-x', `${targetX}px`);
          document.documentElement.style.setProperty('--mouse-y', `${targetY}px`);
          rafId = null;
        });
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return <>{children}</>;
}
