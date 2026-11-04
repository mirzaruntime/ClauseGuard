import { apiClient } from './client';
import type { ApiSuccess, Pagination, Reminder, CreateReminderRequest, ListRemindersRequest, UpdateReminderRequest } from '@/types/api';

export interface ReminderListResult {
  reminders: Reminder[];
  pagination: Pagination;
}

function buildQuery(params: ListRemindersRequest): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (params.page) query.page = params.page;
  if (params.limit) query.limit = params.limit;
  if (params.status) query.status = params.status;
  if (params.obligationId) query.obligationId = params.obligationId;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;
  return query;
}

export const remindersApi = {
  async create(payload: CreateReminderRequest): Promise<Reminder> {
    const { data } = await apiClient.post<ApiSuccess<{ reminder: Reminder }>>(
      '/reminders',
      payload,
    );
    return data.data.reminder;
  },

  async list(params: ListRemindersRequest = {}): Promise<ReminderListResult> {
    const { data } = await apiClient.get<ApiSuccess<{ reminders: Reminder[] }>>('/reminders', {
      params: buildQuery(params),
    });
    return { reminders: data.data.reminders, pagination: data.pagination as Pagination };
  },

  async getById(id: string): Promise<Reminder> {
    const { data } = await apiClient.get<ApiSuccess<{ reminder: Reminder }>>(`/reminders/${id}`);
    return data.data.reminder;
  },

  async update(id: string, payload: UpdateReminderRequest): Promise<Reminder> {
    const { data } = await apiClient.patch<ApiSuccess<{ reminder: Reminder }>>(
      `/reminders/${id}`,
      payload,
    );
    return data.data.reminder;
  },

  /** Cancels a scheduled reminder, or deletes it outright if already sent/failed. */
  async remove(id: string): Promise<Reminder | null> {
    const { data } = await apiClient.delete<ApiSuccess<{ reminder: Reminder | null }>>(
      `/reminders/${id}`,
    );
    return data.data.reminder;
  },
};
