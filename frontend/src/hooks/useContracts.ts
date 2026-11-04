import { useCallback, useState } from 'react';
import { contractsApi } from '@/api';
import { useAsync } from './useAsync';
import type { ContractStatus, ListContractsRequest } from '@/types/api';

export function useContracts() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ContractStatus | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<ListContractsRequest['sortBy']>('createdAt');
  const [sortOrder, setSortOrder] = useState<ListContractsRequest['sortOrder']>('desc');

  const fetcher = useCallback(
    () => contractsApi.list({ page, limit: 12, status, search: search || undefined, sortBy, sortOrder }),
    [page, status, search, sortBy, sortOrder],
  );

  const result = useAsync(fetcher, {
    isEmpty: (data) => data.contracts.length === 0,
  });

  return {
    ...result,
    page,
    setPage,
    status,
    setStatus: (value: ContractStatus | undefined) => {
      setStatus(value);
      setPage(1);
    },
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
  };
}
