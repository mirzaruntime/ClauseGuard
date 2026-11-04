import { apiClient } from './client';
import type { ApiSuccess, Contract, Pagination, ListContractsRequest } from '@/types/api';

export interface ContractListResult {
  contracts: Contract[];
  pagination: Pagination;
}

export interface ContractDetails {
  contract: Contract;
  obligationSummary: Record<string, number>;
  disclaimer: string;
}

function buildQuery(params: ListContractsRequest): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (params.page) query.page = params.page;
  if (params.limit) query.limit = params.limit;
  if (params.status) query.status = params.status;
  if (params.search) query.search = params.search;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  return query;
}

export const contractsApi = {
  async upload(file: File, title: string | undefined, onProgress?: (percent: number) => void) {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);

    const { data } = await apiClient.post<ApiSuccess<{ contract: Contract; disclaimer: string }>>(
      '/contracts/upload',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (!onProgress || !event.total) return;
          onProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
    );
    return data.data;
  },

  async list(params: ListContractsRequest = {}): Promise<ContractListResult> {
    const { data } = await apiClient.get<ApiSuccess<{ contracts: Contract[] }>>('/contracts', {
      params: buildQuery(params),
    });
    return { contracts: data.data.contracts, pagination: data.pagination as Pagination };
  },

  async getById(id: string): Promise<ContractDetails> {
    const { data } = await apiClient.get<ApiSuccess<ContractDetails>>(`/contracts/${id}`);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete<ApiSuccess<null>>(`/contracts/${id}`);
  },
};
