import { useCallback } from 'react';
import { obligationsApi } from '@/api';
import { useAsync } from './useAsync';
import type { Obligation } from '@/types/api';

/**
 * Obligations scoped to one contract via the real `contractId` query param.
 * `refresh` (the hook's own `refetch`) lets callers force a reload after a
 * mutation without re-fetching the parent contract.
 */
export function useContractObligations(contractId: string | undefined) {
  const fetcher = useCallback(async (): Promise<Obligation[]> => {
    if (!contractId) return [];
    const { obligations } = await obligationsApi.list({
      contractId,
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });
    return obligations;
  }, [contractId]);

  const result = useAsync(fetcher);

  return { ...result, refresh: result.refetch };
}
