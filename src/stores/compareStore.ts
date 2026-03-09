import { create } from 'zustand';
import type { Product } from '@/shared/interfaces/Iproduct.interface';

const MAX_COMPARE = 3;

interface CompareState {
  items: Product[];
  addItem: (product: Product) => boolean;
  removeItem: (productId: number) => void;
  clear: () => void;
  isInCompare: (productId: number) => boolean;
}

export const useCompareStore = create<CompareState>((set, get) => ({
  items: [],
  addItem: (product) => {
    const { items } = get();
    if (items.length >= MAX_COMPARE) return false;
    if (items.some((p) => p.id === product.id)) return false;
    set({ items: [...items, product] });
    return true;
  },
  removeItem: (productId) =>
    set((s) => ({ items: s.items.filter((p) => p.id !== productId) })),
  clear: () => set({ items: [] }),
  isInCompare: (productId) => get().items.some((p) => p.id === productId),
}));
