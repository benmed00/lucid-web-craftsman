// src/lib/cache/UnifiedCache.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedCacheManager, createCacheKey, CacheTTL, CacheTags } from './UnifiedCache';

describe('UnifiedCacheManager', () => {
  let cache: UnifiedCacheManager;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new UnifiedCacheManager({
      defaultTTL: 10000, // 10 seconds for faster tests
      defaultStaleTime: 5000, // 5 seconds
      maxSize: 10,
    });
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      cache.set('key1', { name: 'test' });
      const result = cache.get<{ name: string }>('key1');
      
      expect(result.data).toEqual({ name: 'test' });
      expect(result.isStale).toBe(false);
      expect(result.isExpired).toBe(false);
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('nonexistent');
      
      expect(result.data).toBeNull();
      expect(result.isExpired).toBe(true);
    });

    it('should mark data as stale after staleTime', () => {
      cache.set('key1', 'value', { staleTime: 1000 });
      
      vi.advanceTimersByTime(1500);
      const result = cache.get('key1');
      
      expect(result.data).toBe('value');
      expect(result.isStale).toBe(true);
      expect(result.isExpired).toBe(false);
    });

    it('should expire data after TTL', () => {
      cache.set('key1', 'value', { ttl: 2000 });
      
      vi.advanceTimersByTime(2500);
      const result = cache.get('key1');
      
      expect(result.data).toBeNull();
      expect(result.isExpired).toBe(true);
    });

    it('should store data with tags', () => {
      cache.set('product_1', { id: 1 }, { tags: ['products'] });
      cache.set('product_2', { id: 2 }, { tags: ['products'] });
      cache.set('order_1', { id: 1 }, { tags: ['orders'] });
      
      const deleted = cache.invalidateByTag('products');
      
      expect(deleted).toBe(2);
      expect(cache.get('product_1').data).toBeNull();
      expect(cache.get('product_2').data).toBeNull();
      expect(cache.get('order_1').data).toEqual({ id: 1 });
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired key', () => {
      cache.set('key1', 'value');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired key', () => {
      cache.set('key1', 'value', { ttl: 1000 });
      vi.advanceTimersByTime(1500);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should clear all cache when no pattern provided', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const deleted = cache.invalidate();
      
      expect(deleted).toBe(2);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });

    it('should invalidate by exact string pattern', () => {
      cache.set('products_list', 'data');
      cache.set('products_detail', 'data');
      cache.set('orders_list', 'data');
      
      const deleted = cache.invalidate('products*');
      
      expect(deleted).toBe(2);
      expect(cache.has('products_list')).toBe(false);
      expect(cache.has('orders_list')).toBe(true);
    });

    it('should invalidate by regex pattern', () => {
      cache.set('user_123_profile', 'data');
      cache.set('user_123_orders', 'data');
      cache.set('user_456_profile', 'data');
      
      const deleted = cache.invalidate(/user_123.*/);
      
      expect(deleted).toBe(2);
      expect(cache.has('user_123_profile')).toBe(false);
      expect(cache.has('user_456_profile')).toBe(true);
    });
  });

  describe('invalidateByTag', () => {
    it('should remove all entries with specified tag', () => {
      cache.set('p1', 'v1', { tags: ['products', 'featured'] });
      cache.set('p2', 'v2', { tags: ['products'] });
      cache.set('o1', 'v3', { tags: ['orders'] });
      
      const deleted = cache.invalidateByTag('products');
      
      expect(deleted).toBe(2);
      expect(cache.has('o1')).toBe(true);
    });

    it('should return 0 when no entries match tag', () => {
      cache.set('key1', 'value', { tags: ['other'] });
      const deleted = cache.invalidateByTag('nonexistent');
      expect(deleted).toBe(0);
    });
  });

  describe('update', () => {
    it('should update existing entry data', () => {
      cache.set('counter', 0);
      
      const success = cache.update<number>('counter', (current) => (current ?? 0) + 1);
      
      expect(success).toBe(true);
      expect(cache.get<number>('counter').data).toBe(1);
    });

    it('should return false for non-existent key', () => {
      const success = cache.update('nonexistent', () => 'value');
      expect(success).toBe(false);
    });

    it('should reset timestamp on update', () => {
      cache.set('key1', 'original', { staleTime: 1000 });
      
      vi.advanceTimersByTime(800);
      cache.update('key1', () => 'updated');
      
      vi.advanceTimersByTime(500);
      const result = cache.get('key1');
      
      expect(result.data).toBe('updated');
      expect(result.isStale).toBe(false);
    });
  });

  describe('getOrSet', () => {
    it('should return cached data without calling fetcher', async () => {
      cache.set('key1', 'cached');
      const fetcher = vi.fn().mockResolvedValue('fresh');
      
      const result = await cache.getOrSet('key1', fetcher);
      
      expect(result.data).toBe('cached');
      expect(result.fromCache).toBe(true);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher and cache result when key is missing', async () => {
      const fetcher = vi.fn().mockResolvedValue('fresh');
      
      const result = await cache.getOrSet('key1', fetcher);
      
      expect(result.data).toBe('fresh');
      expect(result.fromCache).toBe(false);
      expect(fetcher).toHaveBeenCalledOnce();
      expect(cache.get('key1').data).toBe('fresh');
    });

    it('should force refresh when forceRefresh is true', async () => {
      cache.set('key1', 'cached');
      const fetcher = vi.fn().mockResolvedValue('fresh');
      
      const result = await cache.getOrSet('key1', fetcher, { forceRefresh: true });
      
      expect(result.data).toBe('fresh');
      expect(result.fromCache).toBe(false);
      expect(fetcher).toHaveBeenCalledOnce();
    });

    it('should return stale data and trigger background refresh', async () => {
      cache.set('key1', 'stale', { staleTime: 100, ttl: 10000 });
      vi.advanceTimersByTime(200);

      const fetcher = vi.fn().mockResolvedValue('fresh');

      const result = await cache.getOrSet('key1', fetcher);

      expect(result.data).toBe('stale');
      expect(result.fromCache).toBe(true);
      expect(result.wasStale).toBe(true);

      // Background refresh runs async; yield to let fetcher complete
      await Promise.resolve();
      await Promise.resolve();
      expect(fetcher).toHaveBeenCalled();
    });
  });

  describe('max size eviction', () => {
    it('should evict oldest entry when max size is reached', () => {
      // Fill cache to max size
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
        vi.advanceTimersByTime(10); // Ensure different timestamps
      }
      
      // Add one more - should evict key0 (oldest)
      cache.set('key10', 'value10');
      
      expect(cache.has('key0')).toBe(false);
      expect(cache.has('key10')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should track hits and misses', () => {
      cache.set('existing', 'value');
      
      cache.get('existing'); // hit
      cache.get('existing'); // hit
      cache.get('nonexistent'); // miss
      
      const stats = cache.getStats();
      
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('existing');
    });
  });

  describe('resetStats', () => {
    it('should reset hit and miss counters', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('nonexistent');
      
      cache.resetStats();
      const stats = cache.getStats();
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});

describe('createCacheKey', () => {
  it('should join parts with underscore', () => {
    expect(createCacheKey('products', 'list', 1)).toBe('products_list_1');
  });

  it('should filter out null and undefined values', () => {
    expect(createCacheKey('products', null, 'list', undefined, 1)).toBe('products_list_1');
  });

  it('should handle single part', () => {
    expect(createCacheKey('products')).toBe('products');
  });
});

describe('CacheTTL', () => {
  it('should have correct preset values', () => {
    expect(CacheTTL.SHORT).toBe(2 * 60 * 1000);
    expect(CacheTTL.MEDIUM).toBe(10 * 60 * 1000);
    expect(CacheTTL.LONG).toBe(30 * 60 * 1000);
    expect(CacheTTL.HOUR).toBe(60 * 60 * 1000);
  });
});

describe('CacheTags', () => {
  it('should have correct preset tags', () => {
    expect(CacheTags.PRODUCTS).toBe('products');
    expect(CacheTags.ORDERS).toBe('orders');
    expect(CacheTags.CART).toBe('cart');
    expect(CacheTags.PROFILE).toBe('profile');
    expect(CacheTags.AUTH).toBe('auth');
  });
});
