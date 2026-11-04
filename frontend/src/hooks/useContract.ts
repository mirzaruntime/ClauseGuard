import { useCallback } from 'react';
import { contractsApi } from '@/api';
import { useAsync } from './useAsync';

export function useContract(id: string | undefined) {
  const fetcher = useCallback(() => {
    if (!id) return Promise.reject(new Error('Missing contract id'));
    return contractsApi.getById(id);
  }, [id]);

  return useAsync(fetcher);
}
