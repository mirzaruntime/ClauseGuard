import { useCallback, useState } from 'react';
import { obligationsApi } from '@/api';
import { useAsync } from './useAsync';
import type { ObligationStatus, ListObligationsRequest } from '@/types/api';

export function useObligations() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ObligationStatus | undefined>(undefined);
  const [search, setSearchState] = useState('');
  const [sortBy, setSortBy] = useState<ListObligationsRequest['sortBy']>('deadline');
  const [sortOrder, setSortOrder] = useState<ListObligationsRequest['sortOrder']>('asc');

  const fetcher = useCallback(
    () => obligationsApi.list({ page, limit: 10, status, search: search || undefined, sortBy, sortOrder }),
    [page, status, search, sortBy, sortOrder],
  );

  const result = useAsync(fetcher, {
    isEmpty: (data) => data.obligations.length === 0,
  });

  return {
    ...result,
    page,
    setPage,
    status,
    setStatus: (value: ObligationStatus | undefined) => {
      setStatus(value);
      setPage(1);
    },
    search,
    setSearch: (value: string) => {
      setSearchState(value);
      setPage(1);
    },
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    refresh: result.refetch,
  };
}
