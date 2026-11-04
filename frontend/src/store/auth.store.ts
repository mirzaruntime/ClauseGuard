import { create } from 'zustand';
import { authApi, getStoredToken, setStoredToken } from '@/api';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  /** True while the initial session check (token -> /auth/me) is in flight. */
  isInitializing: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

/**
 * The only piece of state that genuinely needs to be global: who is signed
 * in. Everything else (lists, forms, filters) lives in component state or a
 * data hook, close to where it's used.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getStoredToken(),
  isInitializing: true,
  isAuthenticated: false,

  initialize: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ isInitializing: false, isAuthenticated: false });
      return;
    }
    try {
      const user = await authApi.me();
      set({ user, token, isAuthenticated: true, isInitializing: false });
    } catch {
      setStoredToken(null);
      set({ user: null, token: null, isAuthenticated: false, isInitializing: false });
    }
  },

  login: async (email, password) => {
    const result = await authApi.login({ email, password });
    setStoredToken(result.token);
    set({ user: result.user, token: result.token, isAuthenticated: true });
  },

  register: async (name, email, password) => {
    const result = await authApi.register({ name, email, password });
    setStoredToken(result.token);
    set({ user: result.user, token: result.token, isAuthenticated: true });
  },

  logout: () => {
    setStoredToken(null);
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));
