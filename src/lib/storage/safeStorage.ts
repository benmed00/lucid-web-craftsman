// src/lib/storage/safeStorage.ts
// Robust localStorage wrapper with error handling, quota management, and fallbacks

type StorageType = 'localStorage' | 'sessionStorage';

interface StorageOptions {
  storage?: StorageType;
  ttl?: number; // TTL in milliseconds
  maxSize?: number; // Max size in bytes for this key
}

interface StoredItem<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

// In-memory fallback when localStorage is unavailable
const memoryFallback = new Map<string, string>();

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(
  type: StorageType = 'localStorage'
): boolean {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get the storage object (with fallback to memory)
 */
function getStorage(type: StorageType): Storage | Map<string, string> {
  if (typeof window === 'undefined') {
    return memoryFallback;
  }

  if (isStorageAvailable(type)) {
    return window[type];
  }

  console.warn(`${type} not available, using memory fallback`);
  return memoryFallback;
}

/**
 * Get remaining storage quota (approximate)
 */
/**
 * App-managed storage key prefix.
 * All keys written by this app should use this prefix so that
 * getStorageQuota and clearOldestItems never touch third-party keys.
 */
export const STORAGE_PREFIX = 'rif_';

/**
 * All known app storage keys (Zustand persist names + manual keys).
 * StorageGuard and quota management only operate on these.
 */
export const APP_STORAGE_KEYS = [
  'cart-storage',
  'currency-storage',
  'rif-raw-straw-theme',
  'language-storage',
  'rif_hero_image_cache',
  'cart',
  'cart_offline_queue',
  'preferred_currency',
  'recentlyViewedProducts',
  'theme',
  'auth_state',
  'i18nextLng',
] as const;

/**
 * Get remaining storage quota (approximate, scoped to app keys only)
 */
export function getStorageQuota(): {
  used: number;
  remaining: number;
  total: number;
} {
  const total = 5 * 1024 * 1024; // 5MB typical limit
  let used = 0;

  try {
    for (const key of APP_STORAGE_KEYS) {
      const value = localStorage.getItem(key);
      if (value) {
        // UTF-16: ~2 bytes per char (heuristic, not exact)
        used += (key.length + value.length) * 2;
      }
    }
  } catch {
    // Storage access failed — assume worst case
    return { used: 0, remaining: 0, total };
  }

  return {
    used,
    remaining: Math.max(0, total - used),
    total,
  };
}

/**
 * Safely get an item from storage
 */
export function safeGetItem<T>(
  key: string,
  options: StorageOptions = {}
): T | null {
  const { storage = 'localStorage' } = options;

  try {
    const store = getStorage(storage);
    let raw: string | null | undefined;

    if (store instanceof Map) {
      raw = store.get(key);
    } else {
      raw = store.getItem(key);
    }

    if (!raw) return null;

    const parsed: StoredItem<T> = JSON.parse(raw);

    // Check TTL if set
    if (parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
      safeRemoveItem(key, options);
      return null;
    }

    return parsed.data;
  } catch (error) {
    // If parsing fails, try to return raw value (legacy data)
    try {
      const store = getStorage(storage);
      const raw = store instanceof Map ? store.get(key) : store.getItem(key);
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch {
      console.warn(`Failed to parse storage item "${key}":`, error);
    }
    return null;
  }
}

/**
 * Safely set an item in storage with quota handling
 */
export function safeSetItem<T>(
  key: string,
  value: T,
  options: StorageOptions = {}
): boolean {
  const { storage = 'localStorage', ttl, maxSize } = options;

  try {
    const store = getStorage(storage);

    const item: StoredItem<T> = {
      data: value,
      timestamp: Date.now(),
      ...(ttl && { ttl }),
    };

    const serialized = JSON.stringify(item);

    // Check max size if specified
    if (maxSize && serialized.length * 2 > maxSize) {
      console.warn(
        `Storage item "${key}" exceeds max size (${serialized.length * 2} > ${maxSize})`
      );
      return false;
    }

    // Try to set the item
    if (store instanceof Map) {
      store.set(key, serialized);
    } else {
      try {
        store.setItem(key, serialized);
      } catch (e) {
        // Quota exceeded OR SecurityError (Safari private mode)
        if (
          e instanceof DOMException &&
          (e.code === 22 ||
            e.name === 'QuotaExceededError' ||
            e.name === 'SecurityError')
        ) {
          if (e.name === 'SecurityError') {
            console.warn(
              `SecurityError writing "${key}" — Safari private mode?`
            );
            memoryFallback.set(key, serialized);
            return false;
          }

          console.warn('Storage quota exceeded, clearing old items...');
          clearExpiredItems(storage);

          // Try again
          try {
            store.setItem(key, serialized);
          } catch {
            console.error(
              `Failed to save "${key}" even after clearing expired items`
            );
            // Use memory fallback
            memoryFallback.set(key, serialized);
            return false;
          }
        } else {
          throw e;
        }
      }
    }

    return true;
  } catch (error) {
    console.error(`Failed to save storage item "${key}":`, error);
    // Fallback to memory
    try {
      memoryFallback.set(
        key,
        JSON.stringify({ data: value, timestamp: Date.now() })
      );
    } catch {
      // Ignore
    }
    return false;
  }
}

/**
 * Safely remove an item from storage
 */
export function safeRemoveItem(
  key: string,
  options: StorageOptions = {}
): boolean {
  const { storage = 'localStorage' } = options;

  try {
    const store = getStorage(storage);

    if (store instanceof Map) {
      store.delete(key);
    } else {
      store.removeItem(key);
    }

    // Also remove from memory fallback
    memoryFallback.delete(key);

    return true;
  } catch (error) {
    console.error(`Failed to remove storage item "${key}":`, error);
    return false;
  }
}

/**
 * Clear all expired items from storage
 */
export function clearExpiredItems(type: StorageType = 'localStorage'): number {
  let cleared = 0;

  try {
    if (!isStorageAvailable(type)) return 0;

    const storage = window[type];
    const keysToRemove: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;

      try {
        const raw = storage.getItem(key);
        if (!raw) continue;

        const item = JSON.parse(raw);
        if (
          item.ttl &&
          item.timestamp &&
          Date.now() - item.timestamp > item.ttl
        ) {
          keysToRemove.push(key);
        }
      } catch {
        // Not a JSON item or no TTL, skip
      }
    }

    keysToRemove.forEach((key) => {
      storage.removeItem(key);
      cleared++;
    });
  } catch (error) {
    console.error('Error clearing expired items:', error);
  }

  return cleared;
}

/**
 * Clear old items when quota is exceeded (FIFO by timestamp)
 */
export function clearOldestItems(
  type: StorageType = 'localStorage',
  bytesToFree: number = 100 * 1024 // 100KB default
): number {
  let freed = 0;

  try {
    if (!isStorageAvailable(type)) return 0;

    const storage = window[type];
    const items: Array<{ key: string; timestamp: number; size: number }> = [];

    // Only scan APP_STORAGE_KEYS — never touch third-party keys
    for (const key of APP_STORAGE_KEYS) {
      const value = storage.getItem(key);
      if (!value) continue;

      try {
        const parsed = JSON.parse(value);
        items.push({
          key,
          timestamp: parsed.timestamp || 0,
          size: value.length * 2,
        });
      } catch {
        // Non-JSON app items get lowest priority (oldest timestamp)
        items.push({
          key,
          timestamp: 0,
          size: value.length * 2,
        });
      }
    }

    // Sort by timestamp (oldest first)
    items.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest items until we've freed enough space
    for (const item of items) {
      if (freed >= bytesToFree) break;

      storage.removeItem(item.key);
      freed += item.size;
    }
  } catch (error) {
    console.error('Error clearing oldest items:', error);
  }

  return freed;
}

// ============= Preset Storage Keys =============
export const StorageKeys = {
  CART: 'cart',
  CART_OFFLINE_QUEUE: 'cart_offline_queue',
  CURRENCY: 'preferred_currency',
  RECENTLY_VIEWED: 'recentlyViewedProducts',
  THEME: 'theme',
  AUTH_STATE: 'auth_state',
} as const;

// ============= Preset TTLs =============
export const StorageTTL = {
  SESSION: 30 * 60 * 1000, // 30 minutes
  DAY: 24 * 60 * 60 * 1000, // 1 day
  WEEK: 7 * 24 * 60 * 60 * 1000, // 1 week
  MONTH: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;
