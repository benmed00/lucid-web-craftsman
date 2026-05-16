/**
 * Tests for useCachedProductSearch (sync filter + sort).
 *
 * Prerequisites: none — pure useMemo over an in-memory array.
 * Run: npx vitest run src/hooks/useCachedProductSearch.test.ts
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCachedProductSearch } from './useCachedProductSearch';
import type { AdvancedFilterOptions } from './useAdvancedProductFilters';
import type { Product } from '@/shared/interfaces/Iproduct.interface';

const defaultFilters: AdvancedFilterOptions = {
  searchQuery: '',
  category: [],
  priceRange: [0, 1000],
  sortBy: 'name',
  isNew: false,
  inStock: true,
  artisan: [],
  material: [],
  color: [],
  rating: 0,
};

const product = (overrides: Partial<Product>): Product => ({
  id: overrides.id ?? 1,
  name: overrides.name ?? `product-${overrides.id ?? 1}`,
  price: overrides.price ?? 100,
  images: ['/img.jpg'],
  category: overrides.category ?? 'hats',
  description: overrides.description ?? '',
  details: overrides.details ?? '',
  care: '',
  artisan: overrides.artisan ?? 'A',
  ...overrides,
});

describe('useCachedProductSearch', () => {
  it('returns an empty array when products is empty', () => {
    const { result } = renderHook(() =>
      useCachedProductSearch({ products: [], filters: defaultFilters })
    );
    expect(result.current.filteredProducts).toEqual([]);
  });

  it('filters by category', () => {
    const products = [
      product({ id: 1, category: 'hats', name: 'A' }),
      product({ id: 2, category: 'bags', name: 'B' }),
    ];
    const { result } = renderHook(() =>
      useCachedProductSearch({
        products,
        filters: { ...defaultFilters, category: ['hats'] },
      })
    );
    expect(result.current.filteredProducts.map((p) => p.id)).toEqual([1]);
  });

  it('filters by price range (inclusive bounds)', () => {
    const products = [
      product({ id: 1, price: 50, name: 'A' }),
      product({ id: 2, price: 150, name: 'B' }),
      product({ id: 3, price: 250, name: 'C' }),
    ];
    const { result } = renderHook(() =>
      useCachedProductSearch({
        products,
        filters: { ...defaultFilters, priceRange: [100, 200] },
      })
    );
    expect(result.current.filteredProducts.map((p) => p.id)).toEqual([2]);
  });

  it('sorts by price-asc and price-desc', () => {
    const products = [
      product({ id: 1, price: 30, name: 'A' }),
      product({ id: 2, price: 90, name: 'B' }),
      product({ id: 3, price: 60, name: 'C' }),
    ];

    const asc = renderHook(() =>
      useCachedProductSearch({
        products,
        filters: { ...defaultFilters, sortBy: 'price-asc' },
      })
    );
    expect(asc.result.current.filteredProducts.map((p) => p.id)).toEqual([
      1, 3, 2,
    ]);

    const desc = renderHook(() =>
      useCachedProductSearch({
        products,
        filters: { ...defaultFilters, sortBy: 'price-desc' },
      })
    );
    expect(desc.result.current.filteredProducts.map((p) => p.id)).toEqual([
      2, 3, 1,
    ]);
  });

  it('boosts exact name matches when searching', () => {
    const products = [
      product({ id: 1, name: 'Chapeau de paille' }),
      product({ id: 2, name: 'Sac bandoulière' }),
    ];
    const { result } = renderHook(() =>
      useCachedProductSearch({
        products,
        filters: { ...defaultFilters, searchQuery: 'chapeau' },
      })
    );
    expect(result.current.filteredProducts[0]?.id).toBe(1);
  });

  it('exposes the no-op cache helpers without throwing', () => {
    const { result } = renderHook(() =>
      useCachedProductSearch({ products: [], filters: defaultFilters })
    );
    expect(typeof result.current.prefetchRelatedSearch).toBe('function');
    expect(typeof result.current.invalidateCache).toBe('function');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
  });
});
