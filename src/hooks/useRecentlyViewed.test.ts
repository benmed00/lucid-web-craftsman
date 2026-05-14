/**
 * Tests for useRecentlyViewed (localStorage-backed product history).
 *
 * Prerequisites: jsdom localStorage.
 * Run: npx vitest run src/hooks/useRecentlyViewed.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRecentlyViewed } from './useRecentlyViewed';
import {
  safeRemoveItem,
  safeGetItem,
  StorageKeys,
} from '@/lib/storage/safeStorage';
import type { Product } from '@/shared/interfaces/Iproduct.interface';

const product = (id: number, name = `p${id}`): Product => ({
  id,
  name,
  price: 10 + id,
  images: [`/img/${id}.jpg`],
  category: 'hats',
  description: '',
  details: '',
  care: '',
  artisan: 'A',
});

describe('useRecentlyViewed', () => {
  beforeEach(() => {
    safeRemoveItem(StorageKeys.RECENTLY_VIEWED, { storage: 'localStorage' });
  });

  it('returns an empty list when storage is empty', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.recentlyViewed).toEqual([]);
  });

  it('adds a product to the front of the list', async () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => result.current.addToRecentlyViewed(product(1)));
    expect(result.current.recentlyViewed[0]?.id).toBe(1);

    act(() => result.current.addToRecentlyViewed(product(2)));
    expect(result.current.recentlyViewed.map((p) => p.id)).toEqual([2, 1]);

    await waitFor(() => {
      const stored = safeGetItem<Product[]>(StorageKeys.RECENTLY_VIEWED);
      expect(stored?.map((p) => p.id)).toEqual([2, 1]);
    });
  });

  it('deduplicates and moves an existing product to the front', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => result.current.addToRecentlyViewed(product(1)));
    act(() => result.current.addToRecentlyViewed(product(2)));
    act(() => result.current.addToRecentlyViewed(product(1)));

    expect(result.current.recentlyViewed.map((p) => p.id)).toEqual([1, 2]);
  });

  it('caps the list at 10 items', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => {
      for (let i = 1; i <= 15; i += 1) {
        result.current.addToRecentlyViewed(product(i));
      }
    });

    expect(result.current.recentlyViewed).toHaveLength(10);
    expect(result.current.recentlyViewed[0]?.id).toBe(15);
    expect(result.current.recentlyViewed[9]?.id).toBe(6);
  });

  it('clears the list and removes the storage key', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => result.current.addToRecentlyViewed(product(1)));
    act(() => result.current.clearRecentlyViewed());

    expect(result.current.recentlyViewed).toEqual([]);
    expect(safeGetItem(StorageKeys.RECENTLY_VIEWED)).toBeNull();
  });
});
