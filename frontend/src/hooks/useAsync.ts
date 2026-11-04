import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '@/api';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseAsyncResult<T> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
  errorCode: string | null;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  refetch: () => void;
}

/**
 * Runs an async fetcher whenever its identity changes, exposing a small
 * consistent state machine (idle/loading/success/error) so every API-driven
 * screen handles loading and errors the same way instead of ad hoc booleans.
 *
 * The fetcher IS the dependency: callers memoize it with useCallback against
 * whatever inputs should trigger a refetch (filters, page, a refresh token).
 * That keeps a single source of truth for "what should cause a refetch"
 * instead of a parallel, easy-to-desync deps array.
 */
export function useAsync<T>(
  fetcher: () => Promise<T>,
  options: { isEmpty?: (data: T) => boolean } = {},
): UseAsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const requestId = useRef(0);

  const run = useCallback(() => {
    const id = ++requestId.current;
    setStatus('loading');
    setError(null);
    setErrorCode(null);

    fetcher()
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
        setStatus('success');
      })
      .catch((err: unknown) => {
        if (id !== requestId.current) return;
        if (err instanceof ApiRequestError) {
          setError(err.message);
          setErrorCode(err.code);
        } else {
          setError('Something went wrong. Please try again.');
          setErrorCode(null);
        }
        setStatus('error');
      });
  }, [fetcher]);

  useEffect(() => {
    // Fetch-on-mount/dep-change is React's own documented data-fetching
    // pattern for effects (react.dev/learn/you-might-not-need-an-effect
    // #fetching-data), including setting loading state synchronously at the
    // top of the effect. Race conditions across overlapping fetches are
    // guarded by the requestId check inside `run` above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();
  }, [run]);

  return {
    data,
    status,
    error,
    errorCode,
    isLoading: status === 'loading',
    isError: status === 'error',
    isEmpty: status === 'success' && data !== null && (options.isEmpty?.(data) ?? false),
    refetch: run,
  };
}
