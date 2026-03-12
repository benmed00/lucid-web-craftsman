// src/stores/themeStore.ts
// Zustand store for theme management

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

// ============= Types =============
export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  // State
  theme: Theme;
  resolvedTheme: 'light' | 'dark';

  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Internal
  _updateResolvedTheme: () => void;
}

// ============= Helpers =============
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const applyThemeToDocument = (resolvedTheme: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

// ============= Store =============
export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        theme: 'system',
        resolvedTheme: getSystemTheme(),

        setTheme: (theme) => {
          set({ theme });
          get()._updateResolvedTheme();
        },

        toggleTheme: () => {
          const { resolvedTheme } = get();
          const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
          set({ theme: newTheme });
          get()._updateResolvedTheme();
        },

        _updateResolvedTheme: () => {
          const { theme } = get();
          const resolved = theme === 'system' ? getSystemTheme() : theme;
          set({ resolvedTheme: resolved });
          applyThemeToDocument(resolved);
        },
      }),
      {
        name: 'rif-raw-straw-theme',
        version: 1,
        partialize: (state) => ({ theme: state.theme }),
        migrate: (persisted: any, version: number) => {
          try {
            if (version < 1) {
              const theme = persisted?.theme;
              if (theme && ['light', 'dark', 'system'].includes(theme)) {
                return { theme };
              }
              return { theme: 'system' };
            }
            return persisted;
          } catch {
            return { theme: 'system' };
          }
        },
        storage: {
          getItem: (name) => {
            try {
              const raw = localStorage.getItem(name);
              if (!raw) return null;
              return JSON.parse(raw);
            } catch {
              try { localStorage.removeItem(name); } catch { /* ignore */ }
              return null;
            }
          },
          setItem: (name, value) => {
            try { localStorage.setItem(name, JSON.stringify(value)); } catch { /* ignore */ }
          },
          removeItem: (name) => {
            try { localStorage.removeItem(name); } catch { /* ignore */ }
          },
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            state._updateResolvedTheme();
          }
        },
      }
    ),
    { name: 'theme-store' }
  )
);

// ============= System theme listener =============
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const state = useThemeStore.getState();
    if (state.theme === 'system') {
      state._updateResolvedTheme();
    }
  });
}

// ============= Selectors =============
export const selectTheme = (state: ThemeState) => state.theme;
export const selectResolvedTheme = (state: ThemeState) => state.resolvedTheme;

// ============= Stable selectors =============
const selectSetTheme = (state: ThemeState) => state.setTheme;
const selectToggleTheme = (state: ThemeState) => state.toggleTheme;

// ============= Hook for compatibility =============
export const useTheme = () => {
  const theme = useThemeStore(selectTheme);
  const resolvedTheme = useThemeStore(selectResolvedTheme);
  const setTheme = useThemeStore(selectSetTheme);
  const toggleTheme = useThemeStore(selectToggleTheme);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };
};

// ============= Initialization =============
export const initializeThemeStore = () => {
  // Apply theme on init
  useThemeStore.getState()._updateResolvedTheme();
};
