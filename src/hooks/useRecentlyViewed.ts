import { useState, useEffect, useCallback } from 'react';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { safeGetItem, safeSetItem, safeRemoveItem, StorageKeys, StorageTTL } from '@/lib/storage/safeStorage';

const MAX_RECENTLY_VIEWED = 10;

interface UseRecentlyViewedReturn {
  recentlyViewed: Product[];
  addToRecentlyViewed: (product: Product) => void;
  clearRecentlyViewed: () => void;
}

export const useRecentlyViewed = (): UseRecentlyViewedReturn => {
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  // Load from storage on mount (using safeStorage)
  useEffect(() => {
    const stored = safeGetItem<Product[]>(StorageKeys.RECENTLY_VIEWED);
    if (stored && Array.isArray(stored)) {
      setRecentlyViewed(stored);
    }
  }, []);

  // Save to storage when state changes (using safeStorage)
  useEffect(() => {
    if (recentlyViewed.length > 0) {
      safeSetItem(StorageKeys.RECENTLY_VIEWED, recentlyViewed, { 
        ttl: StorageTTL.MONTH,
        maxSize: 50 * 1024 // 50KB max for recently viewed
      });
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
    safeRemoveItem(StorageKeys.RECENTLY_VIEWED);
  }, []);

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed,
  };
};
