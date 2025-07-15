// src/hooks/useProductFilters.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProductFilters, SortOption, FilterOption } from './useProductFilters'; // Assuming hook is in the same directory or adjust path
import { Product } from '@/shared/interfaces/Iproduct.interface'; // Adjust path as necessary

// Mock Product Data
const mockProducts: Product[] = [
  { id: 1, name: 'Product A', category: 'Category1', price: 10, images: [''], description: '', artisan: '', artisanStory: '', details: '', care: '', new: false, related: [] },
  { id: 2, name: 'Product B', category: 'Category2', price: 20, images: [''], description: '', artisan: '', artisanStory: '', details: '', care: '', new: false, related: [] },
  { id: 3, name: 'Product C', category: 'Category1', price: 5, images: [''], description: '', artisan: '', artisanStory: '', details: '', care: '', new: false, related: [] },
  { id: 4, name: 'Product D', category: 'Category2', price: 15, images: [''], description: '', artisan: '', artisanStory: '', details: '', care: '', new: false, related: [] },
];

describe('useProductFilters', () => {
  it('should initialize with default filter and sort options', () => {
    const { result } = renderHook(() => useProductFilters(mockProducts));

    expect(result.current.activeFilter).toBe('all');
    expect(result.current.currentSort).toBe('popular');
    expect(result.current.filteredAndSortedProducts).toEqual(mockProducts); // Default order
  });

  it('should update activeFilter and filter products', () => {
    const { result } = renderHook(() => useProductFilters(mockProducts));

    act(() => {
      result.current.setActiveFilter('Category1');
    });

    expect(result.current.activeFilter).toBe('Category1');
    expect(result.current.filteredAndSortedProducts).toEqual([
      mockProducts[0], // Product A, price 10
      mockProducts[2], // Product C, price 5
    ]); // Default sort ('popular') doesn't change order here
  });

  it('should return an empty array for a category with no products', () => {
    const { result } = renderHook(() => useProductFilters(mockProducts));

    act(() => {
      result.current.setActiveFilter('CategoryNonExistent');
    });

    expect(result.current.activeFilter).toBe('CategoryNonExistent');
    expect(result.current.filteredAndSortedProducts).toEqual([]);
  });

  it('should filter products and then sort by price ascending', () => {
    const { result } = renderHook(() => useProductFilters(mockProducts));

    act(() => {
      result.current.setActiveFilter('Category2');
    });
    act(() => {
      result.current.setCurrentSort('price-asc');
    });

    expect(result.current.activeFilter).toBe('Category2');
    expect(result.current.currentSort).toBe('price-asc');
    expect(result.current.filteredAndSortedProducts).toEqual([
      mockProducts[3], // Product D, price 15
      mockProducts[1], // Product B, price 20
    ]);
  });

  it('should filter products and then sort by price descending', () => {
    const { result } = renderHook(() => useProductFilters(mockProducts));

    act(() => {
      result.current.setActiveFilter('Category1');
    });
    act(() => {
      result.current.setCurrentSort('price-desc');
    });

    expect(result.current.activeFilter).toBe('Category1');
    expect(result.current.currentSort).toBe('price-desc');
    expect(result.current.filteredAndSortedProducts).toEqual([
      mockProducts[0], // Product A, price 10
      mockProducts[2], // Product C, price 5
    ]);
  });

  it('should sort all products by price ascending', () => {
    const { result } = renderHook(() => useProductFilters(mockProducts));

    act(() => {
      result.current.setCurrentSort('price-asc');
    });

    expect(result.current.currentSort).toBe('price-asc');
    expect(result.current.filteredAndSortedProducts).toEqual([
      mockProducts[2], // Product C, price 5
      mockProducts[0], // Product A, price 10
      mockProducts[3], // Product D, price 15
      mockProducts[1], // Product B, price 20
    ]);
  });

  it('should sort all products by price descending', () => {
    const { result } = renderHook(() => useProductFilters(mockProducts));

    act(() => {
      result.current.setCurrentSort('price-desc');
    });

    expect(result.current.currentSort).toBe('price-desc');
    expect(result.current.filteredAndSortedProducts).toEqual([
      mockProducts[1], // Product B, price 20
      mockProducts[3], // Product D, price 15
      mockProducts[0], // Product A, price 10
      mockProducts[2], // Product C, price 5
    ]);
  });

  it('should revert to all products when filter is set back to "all"', () => {
    const { result } = renderHook(() => useProductFilters(mockProducts));

    act(() => {
      result.current.setActiveFilter('Category1');
    });
    expect(result.current.filteredAndSortedProducts.length).toBe(2);

    act(() => {
      result.current.setActiveFilter('all');
    });
    expect(result.current.activeFilter).toBe('all');
    expect(result.current.filteredAndSortedProducts).toEqual(mockProducts); // Default sort ('popular')
  });

  it('should handle empty initialProducts array', () => {
    const { result } = renderHook(() => useProductFilters([]));
    expect(result.current.filteredAndSortedProducts).toEqual([]);
    act(() => {
      result.current.setActiveFilter('Category1');
    });
    expect(result.current.filteredAndSortedProducts).toEqual([]);
    act(() => {
      result.current.setCurrentSort('price-asc');
    });
    expect(result.current.filteredAndSortedProducts).toEqual([]);
  });

});
