/**
 * Tests for useAdvancedProductFilters (URL state + analytics hook-in).
 *
 * Prerequisites: MemoryRouter wrapper for useSearchParams + mocked activityApi
 * so analytics never hit the network.
 * Run: npx vitest run src/hooks/useAdvancedProductFilters.test.tsx
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

const { logUserProductSearchActivity } = vi.hoisted(() => ({
  logUserProductSearchActivity: vi.fn(),
}));

vi.mock('@/services/activityApi', () => ({
  logUserProductSearchActivity: (...a: unknown[]) =>
    logUserProductSearchActivity(...a),
}));

import { useAdvancedProductFilters } from './useAdvancedProductFilters';
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

describe('useAdvancedProductFilters', () => {
  it('returns all products with no filters active', () => {
    const { result } = renderHook(
      () => useAdvancedProductFilters({ products, enableAnalytics: false }),
      { wrapper: makeWrapper() }
    );
    expect(result.current.filteredProducts).toHaveLength(3);
    expect(result.current.activeFiltersCount).toBe(0);
  });

  it('filters by category through updateFilters', () => {
    const { result } = renderHook(
      () => useAdvancedProductFilters({ products, enableAnalytics: false }),
      { wrapper: makeWrapper() }
    );
    act(() => result.current.updateFilters({ category: ['bags'] }));
    expect(result.current.filteredProducts.map((p) => p.id)).toEqual([2]);
    expect(result.current.activeFiltersCount).toBe(1);
  });

  it('resetFilters returns to the defaults', () => {
    const { result } = renderHook(
      () => useAdvancedProductFilters({ products, enableAnalytics: false }),
      { wrapper: makeWrapper() }
    );
    act(() => result.current.updateFilters({ category: ['hats'], rating: 4 }));
    expect(result.current.activeFiltersCount).toBeGreaterThan(0);
    act(() => result.current.resetFilters());
    expect(result.current.activeFiltersCount).toBe(0);
  });

  it('clearFilter clears a single facet', () => {
    const { result } = renderHook(
      () => useAdvancedProductFilters({ products, enableAnalytics: false }),
      { wrapper: makeWrapper() }
    );
    act(() => result.current.updateFilters({ rating: 4 }));
    expect(result.current.filters.rating).toBe(4);
    act(() => result.current.clearFilter('rating'));
    expect(result.current.filters.rating).toBe(0);
  });

  it('getSearchSuggestions returns matching names + categories + artisans', () => {
    const { result } = renderHook(
      () => useAdvancedProductFilters({ products, enableAnalytics: false }),
      { wrapper: makeWrapper() }
    );
    const suggestions = result.current.getSearchSuggestions('chap');
    expect(suggestions.some((s) => s.toLowerCase().includes('chapeau'))).toBe(
      true
    );
  });

  it('seeds filter state from initial URL parameters', () => {
    const { result } = renderHook(
      () => useAdvancedProductFilters({ products, enableAnalytics: false }),
      { wrapper: makeWrapper(['/?q=chapeau&sort=price-asc']) }
    );
    expect(result.current.filters.searchQuery).toBe('chapeau');
    expect(result.current.filters.sortBy).toBe('price-asc');
  });
});
