import { useState, useEffect, useCallback } from 'react';
import { Product } from '@/shared/interfaces/Iproduct.interface';

const MAX_RECENTLY_VIEWED = 10;
const STORAGE_KEY = 'recentlyViewedProducts';

interface UseRecentlyViewedReturn {
  recentlyViewed: Product[];
  addToRecentlyViewed: (product: Product) => void;
  clearRecentlyViewed: () => void;
}

export const useRecentlyViewed = (): UseRecentlyViewedReturn => {
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentlyViewed(parsed);
      } catch (error) {
        console.error('Error loading recently viewed products:', error);
      }
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (recentlyViewed.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentlyViewed));
    }
  }, [recentlyViewed]);

  const addToRecentlyViewed = useCallback((product: Product) => {
    setRecentlyViewed(prev => {
      // Remove if already exists
      const filtered = prev.filter(p => p.id !== product.id);
      // Add to beginning
      const updated = [product, ...filtered];
      // Keep only MAX_RECENTLY_VIEWED items
      return updated.slice(0, MAX_RECENTLY_VIEWED);
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed,
  };
};
