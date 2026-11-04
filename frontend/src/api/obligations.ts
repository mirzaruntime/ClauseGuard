import { apiClient } from './client';
import type { ApiSuccess, Obligation, ObligationStats, Pagination, ListObligationsRequest, UpdateObligationRequest } from '@/types/api';

export interface ObligationListResult {
  obligations: Obligation[];
  pagination: Pagination;
  disclaimer: string;
}

function buildQuery(params: ListObligationsRequest): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (params.page) query.page = params.page;
  if (params.limit) query.limit = params.limit;
  if (params.status) query.status = params.status;
  if (params.contractId) query.contractId = params.contractId;
  if (params.dueBefore) query.dueBefore = params.dueBefore;
  if (params.dueAfter) query.dueAfter = params.dueAfter;
  if (params.search) query.search = params.search;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  return query;
}

export const obligationsApi = {
  async list(params: ListObligationsRequest = {}): Promise<ObligationListResult> {
    const { data } = await apiClient.get<
      ApiSuccess<{ obligations: Obligation[]; disclaimer: string }>
    >('/obligations', { params: buildQuery(params) });
    return {
      obligations: data.data.obligations,
      disclaimer: data.data.disclaimer,
      pagination: data.pagination as Pagination,
    };
  },

  async stats(): Promise<ObligationStats> {
    const { data } = await apiClient.get<ApiSuccess<{ stats: ObligationStats }>>(
      '/obligations/stats',
    );
    return data.data.stats;
  },

  async getById(id: string): Promise<Obligation> {
    const { data } = await apiClient.get<ApiSuccess<{ obligation: Obligation }>>(
      `/obligations/${id}`,
    );
    return data.data.obligation;
  },

  async update(id: string, payload: UpdateObligationRequest): Promise<Obligation> {
    const { data } = await apiClient.patch<ApiSuccess<{ obligation: Obligation }>>(
      `/obligations/${id}`,
      payload,
    );
    return data.data.obligation;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete<ApiSuccess<null>>(`/obligations/${id}`);
  },
};
