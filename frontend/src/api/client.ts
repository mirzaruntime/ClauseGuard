import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError as ApiErrorBody } from '@/types/api';

/**
 * Base URL comes from Vite's build-time env. Nothing secret lives here — the
 * backend is the security authority; this client only carries a bearer token.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const TOKEN_STORAGE_KEY = 'clauseguard.token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage may be unavailable (private browsing); auth simply won't persist.
  }
}

/** Normalised, UI-friendly error shape. Every thrown error from this client is one of these. */
export class ApiRequestError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly details: ApiErrorBody['details'];
  readonly isNetworkError: boolean;

  constructor(options: {
    message: string;
    status: number | null;
    code: string | null;
    details?: ApiErrorBody['details'];
    isNetworkError?: boolean;
  }) {
    super(options.message);
    this.name = 'ApiRequestError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.isNetworkError = options.isNetworkError ?? false;
  }
}

/** Fired whenever a request fails auth (401) so the app can redirect to /login once, centrally. */
type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;
export function onUnauthorized(listener: UnauthorizedListener): void {
  unauthorizedListener = listener;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (!error.response) {
      return Promise.reject(
        new ApiRequestError({
          message: 'Could not reach the server. Check your connection and try again.',
          status: null,
          code: null,
          isNetworkError: true,
        }),
      );
    }

    const { status, data } = error.response;
    const code = data?.code ?? null;

    if (status === 401 && unauthorizedListener) {
      unauthorizedListener();
    }

    return Promise.reject(
      new ApiRequestError({
        message: data?.message ?? 'Something went wrong. Please try again.',
        status,
        code,
        details: data?.details,
      }),
    );
  },
);
