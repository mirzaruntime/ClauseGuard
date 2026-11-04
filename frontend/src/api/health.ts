import { apiClient } from './client';
import type { ApiSuccess, HealthReadiness } from '@/types/api';

export const healthApi = {
  async ready(): Promise<HealthReadiness> {
    const { data } = await apiClient.get<ApiSuccess<HealthReadiness>>('/health/ready');
    return data.data;
  },
};
