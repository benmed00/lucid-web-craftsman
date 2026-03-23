import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  fetchActiveProductsRaw,
  type OptimizedProductsFilters,
} from '@/services/productService';
import { fetchUserOrdersWithShipmentsAndItems } from '@/services/orderService';
import cache, {
  CacheTTL,
  CacheTags,
  createCacheKey,
} from '@/lib/cache/UnifiedCache';

// Export the generic hook
export { useOptimizedQuery as useOptimizedData };

// Re-export cache utilities for backward compatibility
export const cacheUtils = {
  invalidate: (pattern?: string) => cache.invalidate(pattern),
  getStats: () => cache.getStats(),
  clear: () => cache.invalidate(),
};

interface QueryOptions {
  enableCache?: boolean;
  cacheTime?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  retry?: number;
  tags?: string[];
}

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isStale: boolean;
  refetch: () => Promise<void>;
}

// Generic optimized data fetching hook using UnifiedCache
export function useOptimizedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): QueryState<T> {
  const {
    enableCache = true,
    cacheTime = CacheTTL.MEDIUM,
    staleTime = CacheTTL.SHORT,
    refetchOnWindowFocus = false,
    retry = 1,
    tags = [],
  } = options;

  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: true,
    isError: false,
    error: null,
    isStale: false,
    refetch: async () => {},
  });

  // Use ref to store the latest queryFn to avoid recreating fetchData
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  // Track if this is the first mount
  const hasInitialFetch = useRef(false);
  const currentQueryKey = useRef(queryKey);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      try {
        // Check unified cache first
        if (enableCache && !forceRefresh) {
          const cached = cache.get<T>(queryKey);
          if (cached.data !== null) {
            setState((prev) => ({
              ...prev,
              data: cached.data,
              isLoading: false,
              isError: false,
              error: null,
              isStale: cached.isStale,
            }));

            // If not stale, return cached data
            if (!cached.isStale) return;
          }
        }

        // Set loading state if forcing refresh or no cached data
        setState((prev) => ({
          ...prev,
          isLoading: forceRefresh || !prev.data,
        }));

        // Fetch data with retry logic using ref
        let lastError: Error | null = null;
        for (let attempt = 0; attempt <= retry; attempt++) {
          try {
            const data = await queryFnRef.current();

            // Cache the result using unified cache
            if (enableCache) {
              cache.set(queryKey, data, { ttl: cacheTime, staleTime, tags });
            }

            setState((prev) => ({
              ...prev,
              data,
              isLoading: false,
              isError: false,
              error: null,
              isStale: false,
            }));

            return;
          } catch (error) {
            lastError = error as Error;
            if (attempt < retry) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * Math.pow(2, attempt))
              );
            }
          }
        }

        // All retries failed
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isError: true,
          error: lastError,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isError: true,
          error: error as Error,
        }));
      }
    },
    [queryKey, enableCache, cacheTime, staleTime, retry, tags]
  );

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  // Initial fetch - only run once per queryKey
  useEffect(() => {
    // Only fetch if this is the first mount or queryKey changed
    if (!hasInitialFetch.current || currentQueryKey.current !== queryKey) {
      hasInitialFetch.current = true;
      currentQueryKey.current = queryKey;
      fetchData();
    }
  }, [queryKey]); // Only depend on queryKey, not fetchData

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (state.isStale) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, state.isStale, fetchData]);

  return useMemo(
    () => ({
      ...state,
      refetch,
    }),
    [state, refetch]
  );
}

// Optimized products hook with advanced caching
export function useOptimizedProducts(filters?: {
  category?: string;
  featured?: boolean;
  search?: string;
  limit?: number;
}) {
  const queryKey = createCacheKey('products', JSON.stringify(filters || {}));

  const queryFn = useCallback(async () => {
    return fetchActiveProductsRaw(
      filters as OptimizedProductsFilters | undefined
    );
  }, [filters]);

  return useOptimizedQuery(queryKey, queryFn, {
    cacheTime: CacheTTL.LONG,
    staleTime: CacheTTL.MEDIUM,
    refetchOnWindowFocus: true,
    tags: [CacheTags.PRODUCTS],
  });
}

// Optimized orders hook
export function useOptimizedOrders(userId?: string) {
  const queryKey = createCacheKey('orders', userId);

  const queryFn = useCallback(async () => {
    if (!userId) return [];

    return fetchUserOrdersWithShipmentsAndItems(userId);
  }, [userId]);

  return useOptimizedQuery(queryKey, queryFn, {
    enableCache: !!userId,
    cacheTime: CacheTTL.SHORT,
    tags: [CacheTags.ORDERS],
  });
}

// Prefetch utility for performance
export const prefetchData = {
  products: async (filters?: Record<string, unknown>) => {
    const queryKey = createCacheKey('products', JSON.stringify(filters || {}));

    // Only prefetch if not already cached
    const cached = cache.get(queryKey);
    if (cached.data) return;

    try {
      const data = await fetchActiveProductsRaw({
        category: filters?.category as string | undefined,
        limit: 20,
      });
      if (data.length) {
        cache.set(queryKey, data, {
          ttl: CacheTTL.LONG,
          tags: [CacheTags.PRODUCTS],
        });
      }
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  },
};
