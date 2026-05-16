/**
 * Tests for useProductRecommendations (in-memory scoring).
 *
 * Prerequisites: none.
 * Run: npx vitest run src/hooks/useProductRecommendations.test.ts
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProductRecommendations } from './useProductRecommendations';
import type { Product } from '@/shared/interfaces/Iproduct.interface';

const baseProduct = (overrides: Partial<Product>): Product => ({
  id: overrides.id ?? 1,
  name: overrides.name ?? `p${overrides.id ?? 1}`,
  price: overrides.price ?? 100,
  images: ['/img.jpg'],
  category: overrides.category ?? 'hats',
  description: '',
  details: '',
  care: '',
  artisan: overrides.artisan ?? 'A',
  ...overrides,
});

describe('useProductRecommendations', () => {
  it('returns an empty array when the catalog is empty', () => {
    const { result } = renderHook(() =>
      useProductRecommendations({ allProducts: [] })
    );
    expect(result.current).toEqual([]);
  });

  it('excludes the current product from recommendations', () => {
    const current = baseProduct({ id: 1 });
    const all = [current, baseProduct({ id: 2 }), baseProduct({ id: 3 })];

    const { result } = renderHook(() =>
      useProductRecommendations({ currentProduct: current, allProducts: all })
    );

    expect(result.current.find((p) => p.id === 1)).toBeUndefined();
  });

  it('ranks explicit related_products above pure category matches', () => {
    const current = baseProduct({
      id: 1,
      category: 'hats',
      related_products: [3],
      // mirror legacy alias the hook actually reads
      related: [3],
    } as Partial<Product>);

    const all = [
      current,
      baseProduct({ id: 2, category: 'hats', price: 1000, artisan: 'Z' }),
      baseProduct({ id: 3, category: 'bags', price: 1000, artisan: 'Z' }),
    ];

    const { result } = renderHook(() =>
      useProductRecommendations({ currentProduct: current, allProducts: all })
    );

    expect(result.current[0]?.id).toBe(3);
  });

  it('caps the number of returned recommendations', () => {
    const all = Array.from({ length: 12 }, (_, i) =>
      baseProduct({ id: i + 2, category: 'hats' })
    );
    const current = baseProduct({ id: 1, category: 'hats' });

    const { result } = renderHook(() =>
      useProductRecommendations({
        currentProduct: current,
        allProducts: [current, ...all],
        maxRecommendations: 3,
      })
    );

    expect(result.current).toHaveLength(3);
  });
});
