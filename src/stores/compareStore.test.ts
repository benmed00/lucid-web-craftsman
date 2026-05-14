/**
 * Tests for the compare store (max-3 product comparison list).
 *
 * Prerequisites: none — pure in-memory Zustand store.
 * Run: npx vitest run src/stores/compareStore.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompareStore } from './compareStore';
import type { Product } from '@/shared/interfaces/Iproduct.interface';

const product = (id: number): Product => ({
  id,
  name: `p${id}`,
  price: 10,
  images: [],
  category: 'hats',
  description: '',
  details: '',
  care: '',
  artisan: 'A',
});

describe('useCompareStore', () => {
  beforeEach(() => {
    useCompareStore.setState({ items: [] });
  });

  it('starts empty', () => {
    const { result } = renderHook(() => useCompareStore());
    expect(result.current.items).toEqual([]);
  });

  it('addItem accepts up to 3 products and rejects duplicates and overflow', () => {
    const { result } = renderHook(() => useCompareStore());

    expect(act(() => useCompareStore.getState().addItem(product(1)))).not
      .toThrow;
    act(() => {
      useCompareStore.getState().addItem(product(1));
      useCompareStore.getState().addItem(product(2));
      useCompareStore.getState().addItem(product(3));
    });
    expect(result.current.items.map((p) => p.id)).toEqual([1, 2, 3]);

    let overflowAccepted = true;
    act(() => {
      overflowAccepted = useCompareStore.getState().addItem(product(4));
    });
    expect(overflowAccepted).toBe(false);

    let duplicateAccepted = true;
    act(() => {
      useCompareStore.setState({ items: [product(1)] });
      duplicateAccepted = useCompareStore.getState().addItem(product(1));
    });
    expect(duplicateAccepted).toBe(false);
  });

  it('removeItem and clear update the list', () => {
    act(() => {
      useCompareStore.getState().addItem(product(1));
      useCompareStore.getState().addItem(product(2));
      useCompareStore.getState().removeItem(1);
    });
    expect(useCompareStore.getState().items.map((p) => p.id)).toEqual([2]);

    act(() => useCompareStore.getState().clear());
    expect(useCompareStore.getState().items).toEqual([]);
  });

  it('isInCompare reports membership', () => {
    act(() => useCompareStore.getState().addItem(product(7)));
    expect(useCompareStore.getState().isInCompare(7)).toBe(true);
    expect(useCompareStore.getState().isInCompare(99)).toBe(false);
  });
});
