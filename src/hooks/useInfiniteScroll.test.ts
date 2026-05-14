/**
 * Tests for useInfiniteScroll.
 *
 * Prerequisites: stubbed IntersectionObserver (jsdom does not implement it);
 * fake timers for the 300 ms loadMore delay.
 * Run: npx vitest run src/hooks/useInfiniteScroll.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInfiniteScroll } from './useInfiniteScroll';

class FakeIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(
    _cb: IntersectionObserverCallback,
    _opts?: IntersectionObserverInit
  ) {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  root: Element | null = null;
  rootMargin = '';
  thresholds: number[] = [];
}

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: FakeIntersectionObserver,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('shows the first page slice and reports hasMore', () => {
    const { result } = renderHook(() =>
      useInfiniteScroll<number>({ items: range(40), itemsPerPage: 12 })
    );
    expect(result.current.visibleItems).toHaveLength(12);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('loadMore advances the page after a delay', () => {
    const { result } = renderHook(() =>
      useInfiniteScroll<number>({ items: range(40), itemsPerPage: 12 })
    );

    act(() => result.current.loadMore());
    expect(result.current.isLoading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.visibleItems).toHaveLength(24);
  });

  it('does nothing when there is nothing more to load', () => {
    const { result } = renderHook(() =>
      useInfiniteScroll<number>({ items: range(5), itemsPerPage: 12 })
    );
    expect(result.current.hasMore).toBe(false);

    act(() => result.current.loadMore());
    expect(result.current.isLoading).toBe(false);
  });

  it('resets to page 1 when the items array changes identity and length', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useInfiniteScroll<number>({ items, itemsPerPage: 12 }),
      { initialProps: { items: range(40) } }
    );

    act(() => result.current.loadMore());
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.visibleItems).toHaveLength(24);

    rerender({ items: range(20) });
    expect(result.current.visibleItems).toHaveLength(12);
  });
});
