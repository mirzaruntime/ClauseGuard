import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'clauseguard-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? getSystemTheme() : preference;
}

function readStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';

  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
  } catch {
    return 'system';
  }
}

interface ThemeState {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  syncSystemTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: readStoredTheme(),
  resolvedTheme: resolveTheme(readStoredTheme()),
  setTheme: (theme) => {
    const resolvedTheme = resolveTheme(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore failures and keep the app functional.
    }
    set({ theme, resolvedTheme });
  },
  syncSystemTheme: () => {
    const { theme } = get();
    if (theme !== 'system') return;
    set({ resolvedTheme: getSystemTheme() });
  },
}));
