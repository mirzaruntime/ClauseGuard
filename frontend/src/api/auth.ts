import { apiClient } from './client';
import type { ApiSuccess, AuthResult, RegisterRequest, LoginRequest, UpdateProfileRequest, ChangePasswordRequest, User } from '@/types/api';

export const authApi = {
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post<ApiSuccess<null>>('/auth/forgot-password', { email });
  },

  async resetPassword(payload: { token: string; password: string }): Promise<void> {
    await apiClient.post<ApiSuccess<null>>('/auth/reset-password', payload);
  },

  async register(payload: RegisterRequest): Promise<AuthResult> {
    const { data } = await apiClient.post<ApiSuccess<AuthResult>>('/auth/register', payload);
    return data.data;
  },

  async login(payload: LoginRequest): Promise<AuthResult> {
    const { data } = await apiClient.post<ApiSuccess<AuthResult>>('/auth/login', payload);
    return data.data;
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<ApiSuccess<{ user: User }>>('/auth/me');
    return data.data.user;
  },

  async updateProfile(payload: UpdateProfileRequest): Promise<User> {
    const { data } = await apiClient.patch<ApiSuccess<{ user: User }>>('/users/me', payload);
    return data.data.user;
  },

  async changePassword(payload: ChangePasswordRequest): Promise<void> {
    await apiClient.post<ApiSuccess<null>>('/users/me/password', payload);
  },
};
