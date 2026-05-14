/**
 * Tests for useProductFilters (URL-synced filter state).
 *
 * Prerequisites: MemoryRouter wrapper for useSearchParams.
 * Run: npx vitest run src/hooks/useProductFilters.test.tsx
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useProductFilters } from './useProductFilters';
import type { Product } from '@/shared/interfaces/Iproduct.interface';

const product = (overrides: Partial<Product>): Product => ({
  id: overrides.id ?? 1,
  name: overrides.name ?? `p${overrides.id ?? 1}`,
  price: overrides.price ?? 100,
  images: [],
  category: overrides.category ?? 'hats',
  description: overrides.description ?? '',
  details: '',
  care: '',
  artisan: overrides.artisan ?? 'A',
  ...overrides,
});

const products: Product[] = [
  product({ id: 1, name: 'Chapeau A', price: 30, category: 'hats' }),
  product({ id: 2, name: 'Sac B', price: 80, category: 'bags' }),
  product({ id: 3, name: 'Chapeau C', price: 50, category: 'hats' }),
];

function makeWrapper(initialEntries: string[] = ['/']) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}

describe('useProductFilters', () => {
  it('returns all products when no URL filters override the defaults', () => {
    const { result } = renderHook(() => useProductFilters({ products }), {
      wrapper: makeWrapper(),
    });
    // Hook seeds priceRange from `?minPrice=0&maxPrice=200` defaults but the
    // actual product bounds are tighter ([30, 80]); that mismatch counts as
    // one "active" range filter even though no user filter is applied.
    expect(result.current.filteredProducts).toHaveLength(3);
    expect(result.current.totalProducts).toBe(3);
  });

  it('filters by category and increments the active filter count', () => {
    const { result } = renderHook(() => useProductFilters({ products }), {
      wrapper: makeWrapper(),
    });
    const baseline = result.current.activeFiltersCount;
    act(() => result.current.updateFilters({ category: ['hats'] }));
    expect(result.current.filteredProducts.map((p) => p.id)).toEqual([1, 3]);
    expect(result.current.activeFiltersCount).toBe(baseline + 1);
  });

  it('sorts by price-desc', () => {
    const { result } = renderHook(() => useProductFilters({ products }), {
      wrapper: makeWrapper(),
    });
    act(() => result.current.updateFilters({ sortBy: 'price-desc' }));
    expect(result.current.filteredProducts.map((p) => p.id)).toEqual([
      2, 3, 1,
    ]);
  });

  it('matches search query against name / description / category', () => {
    const { result } = renderHook(() => useProductFilters({ products }), {
      wrapper: makeWrapper(),
    });
    act(() => result.current.updateFilters({ searchQuery: 'chapeau' }));
    expect(result.current.filteredProducts.map((p) => p.id)).toEqual([1, 3]);
  });

  it('resetFilters restores the default state', () => {
    const { result } = renderHook(() => useProductFilters({ products }), {
      wrapper: makeWrapper(),
    });
    act(() =>
      result.current.updateFilters({
        category: ['hats'],
        sortBy: 'price-asc',
        searchQuery: 'foo',
      })
    );
    expect(result.current.activeFiltersCount).toBeGreaterThan(0);

    act(() => result.current.resetFilters());
    expect(result.current.activeFiltersCount).toBe(0);
    expect(result.current.filters.searchQuery).toBe('');
  });

  it('seeds filter state from initial URL params', () => {
    const { result } = renderHook(() => useProductFilters({ products }), {
      wrapper: makeWrapper(['/?q=chapeau&sortBy=price-asc']),
    });
    expect(result.current.filters.searchQuery).toBe('chapeau');
    expect(result.current.filters.sortBy).toBe('price-asc');
    expect(result.current.filteredProducts.map((p) => p.id)).toEqual([1, 3]);
  });
});
