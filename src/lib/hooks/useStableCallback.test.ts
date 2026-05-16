/**
 * Tests for useStableCallback / useStableValue / useDebouncedCallback / useThrottledCallback.
 *
 * Prerequisites: jsdom + fake timers (Vitest builtin).
 * Run: npx vitest run src/lib/hooks/useStableCallback.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useStableCallback,
  useStableValue,
  useDebouncedCallback,
  useThrottledCallback,
} from './useStableCallback';

describe('useStableCallback', () => {
  it('returns a stable function reference across rerenders', () => {
    const first = vi.fn();
    const second = vi.fn();

    const { result, rerender } = renderHook(({ cb }) => useStableCallback(cb), {
      initialProps: { cb: first },
    });

    const ref1 = result.current;
    rerender({ cb: second });
    const ref2 = result.current;

    expect(ref1).toBe(ref2);
  });

  it('always invokes the latest closure', () => {
    const first = vi.fn();
    const second = vi.fn();

    const { result, rerender } = renderHook(({ cb }) => useStableCallback(cb), {
      initialProps: { cb: first },
    });

    rerender({ cb: second });
    (result.current as () => void)();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe('useStableValue', () => {
  it('returns the same reference while the value is structurally equal', () => {
    const { result, rerender } = renderHook(({ v }) => useStableValue(v), {
      initialProps: { v: { a: 1, b: 2 } },
    });

    const first = result.current;
    rerender({ v: { a: 1, b: 2 } });
    expect(result.current).toBe(first);
  });

  it('updates the reference when the value changes', () => {
    const { result, rerender } = renderHook(({ v }) => useStableValue(v), {
      initialProps: { v: { a: 1 } as Record<string, number> },
    });

    const first = result.current;
    rerender({ v: { a: 2 } });
    expect(result.current).not.toBe(first);
    expect(result.current).toEqual({ a: 2 });
  });

  it('honors a custom isEqual comparator', () => {
    const isEqual = (a: { id: number }, b: { id: number }) => a.id === b.id;
    const { result, rerender } = renderHook(
      ({ v }) => useStableValue(v, isEqual),
      { initialProps: { v: { id: 1, payload: 'x' } } }
    );

    const first = result.current;
    rerender({ v: { id: 1, payload: 'y' } });
    expect(result.current).toBe(first);
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces repeated calls into a single invocation after delay', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 100));

    (result.current as () => void)();
    (result.current as () => void)();
    (result.current as () => void)();

    expect(fn).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('clears the pending timer on unmount', () => {
    const fn = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(fn, 100));

    (result.current as () => void)();
    unmount();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('useThrottledCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires immediately on the first call and suppresses calls within the window', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(fn, 200));

    (result.current as () => void)();
    (result.current as () => void)();
    (result.current as () => void)();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(199);
    (result.current as () => void)();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    (result.current as () => void)();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
