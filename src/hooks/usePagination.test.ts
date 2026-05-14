/**
 * Tests for usePagination (generic page math).
 *
 * Prerequisites: none.
 * Run: npx vitest run src/hooks/usePagination.test.ts
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

const range = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => i + 1);

describe('usePagination', () => {
  it('computes total pages and slices the first page', () => {
    const { result } = renderHook(() =>
      usePagination<number>({ items: range(25), itemsPerPage: 10 })
    );

    expect(result.current.totalPages).toBe(3);
    expect(result.current.totalItems).toBe(25);
    expect(result.current.paginatedItems).toEqual(range(10));
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPreviousPage).toBe(false);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(10);
  });

  it('navigates next and previous within bounds', () => {
    const { result } = renderHook(() =>
      usePagination<number>({ items: range(25), itemsPerPage: 10 })
    );

    act(() => result.current.nextPage());
    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedItems).toEqual(range(20).slice(10));

    act(() => result.current.nextPage());
    expect(result.current.currentPage).toBe(3);
    expect(result.current.hasNextPage).toBe(false);

    act(() => result.current.nextPage());
    expect(result.current.currentPage).toBe(3);

    act(() => result.current.previousPage());
    expect(result.current.currentPage).toBe(2);
  });

  it('clamps goToPage between 1 and totalPages', () => {
    const { result } = renderHook(() =>
      usePagination<number>({ items: range(25), itemsPerPage: 10 })
    );

    act(() => result.current.goToPage(99));
    expect(result.current.currentPage).toBe(3);

    act(() => result.current.goToPage(-5));
    expect(result.current.currentPage).toBe(1);
  });

  it('resets to page 1 when itemsPerPage changes', () => {
    const { result } = renderHook(() =>
      usePagination<number>({ items: range(25), itemsPerPage: 10 })
    );

    act(() => result.current.goToPage(3));
    expect(result.current.currentPage).toBe(3);

    act(() => result.current.setItemsPerPage(5));
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(5);
  });

  it('keeps totalPages >= 1 even for empty lists', () => {
    const { result } = renderHook(() =>
      usePagination<number>({ items: [], itemsPerPage: 10 })
    );

    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedItems).toEqual([]);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPreviousPage).toBe(false);
  });
});
