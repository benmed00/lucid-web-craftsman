import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UIStyle = 'legacy' | 'modern';

interface UIStyleState {
  uiStyle: UIStyle;
  setUIStyle: (style: UIStyle) => void;
  toggleUIStyle: () => void;
}

const applyUIStyle = (style: UIStyle) => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-ui-style', style);
};

export const useUIStyleStore = create<UIStyleState>()(
  persist(
    (set, get) => ({
      uiStyle: 'modern',
      setUIStyle: (style) => {
        set({ uiStyle: style });
        applyUIStyle(style);
      },
      toggleUIStyle: () => {
        const next = get().uiStyle === 'modern' ? 'legacy' : 'modern';
        set({ uiStyle: next });
        applyUIStyle(next);
      },
    }),
    {
      name: 'rif-raw-straw-ui-style',
      version: 1,
      partialize: (state) => ({ uiStyle: state.uiStyle }),
      onRehydrateStorage: () => (state) => {
        if (state) applyUIStyle(state.uiStyle);
      },
      storage: {
        getItem: (name) => {
          try {
            const raw = localStorage.getItem(name);
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch { /* quota */ }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch { /* ignore */ }
        },
      },
    }
  )
);

export const initializeUIStyleStore = () => {
  applyUIStyle(useUIStyleStore.getState().uiStyle);
};
