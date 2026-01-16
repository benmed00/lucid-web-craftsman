// src/lib/cache/UnifiedCache.ts
// Unified caching system for the entire application

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
  staleTime: number;
  tags: string[];
};

type CacheStats = {
  size: number;
  hits: number;
  misses: number;
  keys: string[];
};

type CacheConfig = {
  defaultTTL?: number;
  defaultStaleTime?: number;
  maxSize?: number;
  onEvict?: (key: string, data: unknown) => void;
};

const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes
const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500;

class UnifiedCacheManager {
  private cache = new Map<string, CacheEntry<unknown>>();
  private config: Required<CacheConfig>;
  private stats = { hits: 0, misses: 0 };
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTTL: config.defaultTTL ?? DEFAULT_TTL,
      defaultStaleTime: config.defaultStaleTime ?? DEFAULT_STALE_TIME,
      maxSize: config.maxSize ?? MAX_CACHE_SIZE,
      onEvict: config.onEvict ?? (() => {}),
    };

    // Start periodic cleanup only in browser environment
    if (typeof window !== 'undefined') {
      this.startCleanup();
      this.initialized = true;
    }
  }

  /**
   * Set a value in cache with optional TTL and tags
   */
  set<T>(
    key: string, 
    data: T, 
    options?: { 
      ttl?: number; 
      staleTime?: number;
      tags?: string[];
    }
  ): void {
    // Enforce max size by evicting oldest entries
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: options?.ttl ?? this.config.defaultTTL,
      staleTime: options?.staleTime ?? this.config.defaultStaleTime,
      tags: options?.tags ?? [],
    });
  }

  /**
   * Get a value from cache
   * Returns the data and whether it's stale (but still valid)
   */
  get<T>(key: string): { data: T | null; isStale: boolean; isExpired: boolean } {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      return { data: null, isStale: false, isExpired: true };
    }

    const age = Date.now() - entry.timestamp;
    
    // Fully expired - remove and return null
    if (age > entry.ttl) {
      this.cache.delete(key);
      this.config.onEvict(key, entry.data);
      this.stats.misses++;
      return { data: null, isStale: false, isExpired: true };
    }

    this.stats.hits++;
    
    // Stale but still usable
    if (age > entry.staleTime) {
      return { data: entry.data, isStale: true, isExpired: false };
    }

    // Fresh data
    return { data: entry.data, isStale: false, isExpired: false };
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const { data } = this.get(key);
    return data !== null;
  }

  /**
   * Invalidate specific key(s) by pattern or exact match
   */
  invalidate(pattern?: string | RegExp): number {
    if (!pattern) {
      const size = this.cache.size;
      this.cache.clear();
      return size;
    }

    let deleted = 0;
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*'))
      : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        const entry = this.cache.get(key);
        this.cache.delete(key);
        if (entry) this.config.onEvict(key, entry.data);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Invalidate all entries with a specific tag
   */
  invalidateByTag(tag: string): number {
    let deleted = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        this.config.onEvict(key, entry.data);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Update an existing entry's data without changing TTL
   */
  update<T>(key: string, updater: (current: T | null) => T): boolean {
    const existing = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!existing) {
      return false;
    }

    existing.data = updater(existing.data);
    existing.timestamp = Date.now();
    return true;
  }

  /**
   * Get or set - returns cached value or fetches and caches new value
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { 
      ttl?: number; 
      staleTime?: number;
      tags?: string[];
      forceRefresh?: boolean;
    }
  ): Promise<{ data: T; fromCache: boolean; wasStale: boolean }> {
    // Check cache first (unless forcing refresh)
    if (!options?.forceRefresh) {
      const cached = this.get<T>(key);
      
      if (cached.data !== null && !cached.isExpired) {
        // If stale, trigger background refresh but return cached data
        if (cached.isStale) {
          this.refreshInBackground(key, fetcher, options);
        }
        return { data: cached.data, fromCache: true, wasStale: cached.isStale };
      }
    }

    // Fetch fresh data
    const data = await fetcher();
    this.set(key, data, options);
    return { data, fromCache: false, wasStale: false };
  }

  /**
   * Refresh data in background without blocking
   */
  private async refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; staleTime?: number; tags?: string[] }
  ): Promise<void> {
    try {
      const data = await fetcher();
      this.set(key, data, options);
    } catch (error) {
      // Silent fail for background refresh
      console.warn(`Background refresh failed for key: ${key}`, error);
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      if (entry) this.config.onEvict(oldestKey, entry.data);
    }
  }

  /**
   * Remove expired entries periodically
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.config.onEvict(key, entry.data);
      }
    }
  }

  private startCleanup(): void {
    // Cleanup every 5 minutes - only in browser environment
    if (typeof window !== 'undefined' && typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Cleanup and destroy the cache instance
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// ============= Singleton Instance =============
export const cache = new UnifiedCacheManager();

// ============= Preset Cache Configurations =============
export const CacheTTL = {
  SHORT: 2 * 60 * 1000,      // 2 minutes
  MEDIUM: 10 * 60 * 1000,    // 10 minutes  
  LONG: 30 * 60 * 1000,      // 30 minutes
  HOUR: 60 * 60 * 1000,      // 1 hour
} as const;

export const CacheTags = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CART: 'cart',
  PROFILE: 'profile',
  AUTH: 'auth',
} as const;

// ============= Helper Functions =============

/**
 * Create a cache key from components
 */
export function createCacheKey(...parts: (string | number | undefined | null)[]): string {
  return parts.filter(Boolean).join('_');
}

/**
 * Invalidate all product-related cache
 */
export function invalidateProductCache(): number {
  return cache.invalidateByTag(CacheTags.PRODUCTS);
}

/**
 * Invalidate all user-specific cache
 */
export function invalidateUserCache(userId?: string): number {
  if (userId) {
    return cache.invalidate(new RegExp(`.*${userId}.*`));
  }
  return cache.invalidateByTag(CacheTags.PROFILE) + cache.invalidateByTag(CacheTags.ORDERS);
}

export { UnifiedCacheManager };
export default cache;
