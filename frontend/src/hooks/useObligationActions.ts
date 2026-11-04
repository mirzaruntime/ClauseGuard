import { useState } from 'react';
import { obligationsApi, ApiRequestError } from '@/api';
import { toast } from '@/store/toast.store';
import type { Obligation, UpdateObligationRequest } from '@/types/api';

/**
 * Centralizes obligation mutations (confirm/reject/edit/complete/restore) so
 * every screen that lets a user act on an obligation shares the same
 * request-in-flight tracking, error handling and toast feedback. The backend
 * PATCH response is always the source of truth for the resulting state.
 */
export function useObligationActions(onUpdated?: (obligation: Obligation) => void) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const run = async (id: string, payload: UpdateObligationRequest, successMessage: string) => {
    setPendingId(id);
    try {
      const updated = await obligationsApi.update(id, payload);
      onUpdated?.(updated);
      toast.success(successMessage);
      return updated;
    } catch (error) {
      toast.error(
        'Could not update obligation',
        error instanceof ApiRequestError ? error.message : undefined,
      );
      throw error;
    } finally {
      setPendingId(null);
    }
  };

  return {
    pendingId,
    confirm: (id: string) => run(id, { status: 'confirmed' }, 'Obligation confirmed'),
    reject: (id: string) => run(id, { status: 'rejected' }, 'Obligation rejected'),
    restore: (id: string) => run(id, { status: 'potential' }, 'Obligation restored for review'),
    complete: (id: string) => run(id, { status: 'completed' }, 'Obligation marked complete'),
    edit: (id: string, payload: UpdateObligationRequest) =>
      run(id, payload, 'Obligation updated'),
  };
}
