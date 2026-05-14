/**
 * useCart facade: derived counts from Zustand cart store.
 *
 * Prerequisites: reset cart store state between tests.
 * Run: npx vitest run src/stores/useCart.hook.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart, useCartStore } from './cartStore';
import type { Product } from '@/shared/interfaces/Iproduct.interface';

const sampleProduct = (id: number): Product => ({
  id,
  name: `Product ${id}`,
  price: 10,
  images: ['/x.webp'],
  category: 'hats',
  description: '',
  details: '',
  care: '',
  artisan: 'A',
});

describe('useCart hook', () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [],
      isOnline: true,
      isAuthenticated: false,
      isSyncing: false,
      isInitialized: true,
      offlineQueue: [],
    });
  });

  it('reports zero items for an empty cart', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('counts only lines with hydrated product data', () => {
    act(() => {
      useCartStore.getState()._setItems([
        {
          id: 1,
          quantity: 2,
          product: sampleProduct(1),
        },
        {
          id: 2,
          quantity: 1,
          product: {} as Product,
        },
      ]);
    });
    const { result } = renderHook(() => useCart());
    expect(result.current.cart.items.length).toBe(1);
    expect(result.current.itemCount).toBe(2);
  });
});
