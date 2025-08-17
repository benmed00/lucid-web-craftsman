import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Export the generic hook
export { useOptimizedQuery as useOptimizedData };

// Generic cache implementation with TTL
class DataCache {
  private cache = new Map<string, { 
    data: any; 
    timestamp: number; 
    ttl: number; 
    stale?: boolean;
  }>();
  
  private defaultTTL = 10 * 60 * 1000; // 10 minutes
  private staleTime = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl = this.defaultTTL) {
    this.cache.set(key, { 
      data, 
      timestamp: Date.now(), 
      ttl,
      stale: false 
    });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return { data: null, isStale: false };
    
    const now = Date.now();
    const age = now - item.timestamp;
    
    // Mark as stale but still usable
    if (age > this.staleTime && age <= item.ttl) {
      item.stale = true;
      return { data: item.data, isStale: true };
    }
    
    // Expired - remove from cache
    if (age > item.ttl) {
      this.cache.delete(key);
      return { data: null, isStale: false };
    }
    
    return { data: item.data, isStale: false };
  }

  invalidate(keyPattern?: string) {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }
    
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(keyPattern)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

const dataCache = new DataCache();

interface QueryOptions {
  enableCache?: boolean;
  cacheTime?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  retry?: number;
}

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isStale: boolean;
  refetch: () => Promise<void>;
}

// Generic optimized data fetching hook
export function useOptimizedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): QueryState<T> {
  const {
    enableCache = true,
    cacheTime = 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus = false,
    retry = 1,
  } = options;

  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: true,
    isError: false,
    error: null,
    isStale: false,
    refetch: async () => {},
  });

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first
      if (enableCache && !forceRefresh) {
        const cached = dataCache.get(queryKey);
        if (cached.data) {
          setState(prev => ({
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

      // Set loading state if no cached data
      if (!state.data || forceRefresh) {
        setState(prev => ({ ...prev, isLoading: true }));
      }

      // Fetch data with retry logic
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= retry; attempt++) {
        try {
          const data = await queryFn();
          
          // Cache the result
          if (enableCache) {
            dataCache.set(queryKey, data, cacheTime);
          }

          setState(prev => ({
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
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          }
        }
      }

      // All retries failed
      setState(prev => ({
        ...prev,
        isLoading: false,
        isError: true,
        error: lastError,
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isError: true,
        error: error as Error,
      }));
    }
  }, [queryKey, queryFn, enableCache, cacheTime, retry]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  return useMemo(() => ({
    ...state,
    refetch,
  }), [state, refetch]);
}

// Optimized products hook with advanced caching
export function useOptimizedProducts(filters?: {
  category?: string;
  featured?: boolean;
  search?: string;
  limit?: number;
}) {
  const queryKey = `products_${JSON.stringify(filters || {})}`;
  
  const queryFn = useCallback(async () => {
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true);

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    
    if (filters?.featured) {
      query = query.eq('is_featured', true);
    }
    
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%, description.ilike.%${filters.search}%`);
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    
    return data;
  }, [filters]);

  return useOptimizedQuery(queryKey, queryFn, {
    cacheTime: 15 * 60 * 1000, // Cache products for 15 minutes
    refetchOnWindowFocus: true,
  });
}

// Optimized orders hook
export function useOptimizedOrders(userId?: string) {
  const queryKey = `orders_${userId}`;
  
  const queryFn = useCallback(async () => {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        shipments(*),
        order_items(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }, [userId]);

  return useOptimizedQuery(queryKey, queryFn, {
    enableCache: !!userId,
    cacheTime: 5 * 60 * 1000, // Cache orders for 5 minutes
  });
}

// Optimized cart hook with real-time updates
export function useOptimizedCart(userId?: string) {
  const queryKey = `cart_${userId}`;
  
  const queryFn = useCallback(async () => {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        products(*)
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }, [userId]);

  const result = useOptimizedQuery(queryKey, queryFn, {
    enableCache: !!userId,
    cacheTime: 2 * 60 * 1000, // Cache cart for 2 minutes
    refetchOnWindowFocus: true,
  });

  // Set up real-time subscription for cart changes
  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel(`cart_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cart_items',
        filter: `user_id=eq.${userId}`,
      }, () => {
        // Invalidate cache and refetch
        dataCache.invalidate(`cart_${userId}`);
        result.refetch();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, result]);

  return result;
}

// Cache management utilities
export const cacheUtils = {
  invalidate: (pattern?: string) => dataCache.invalidate(pattern),
  getStats: () => dataCache.getStats(),
  clear: () => dataCache.invalidate(),
};

// Prefetch utility for performance
export const prefetchData = {
  products: (filters?: any) => {
    const queryKey = `products_${JSON.stringify(filters || {})}`;
    // Prefetch in background without updating UI
    setTimeout(async () => {
      try {
        const cached = dataCache.get(queryKey);
        if (!cached.data) {
          let query = supabase
            .from('products')
            .select('*')
            .eq('is_active', true);

          if (filters?.category) {
            query = query.eq('category', filters.category);
          }
          
          const { data } = await query.limit(20);
          if (data) {
            dataCache.set(queryKey, data);
          }
        }
      } catch (error) {
        console.warn('Prefetch failed:', error);
      }
    }, 100);
  },
};