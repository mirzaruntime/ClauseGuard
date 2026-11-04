import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  // Tracks which query the current `matches` value corresponds to. If `query`
  // changes between renders, this recomputes synchronously during render
  // (React's documented pattern for adjusting state from a prop change)
  // instead of needing an effect just to catch up.
  const [trackedQuery, setTrackedQuery] = useState(query);

  if (query !== trackedQuery) {
    setTrackedQuery(query);
    setMatches(window.matchMedia(query).matches);
  }

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
