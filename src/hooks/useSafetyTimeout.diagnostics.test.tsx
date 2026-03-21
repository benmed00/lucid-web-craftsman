import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSafetyTimeout } from './useSafetyTimeout';

describe('useSafetyTimeout diagnostics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('forces timeout state when loading never resolves', () => {
    const { result } = renderHook(() =>
      useSafetyTimeout(true, { timeout: 1000, slowThreshold: 400 })
    );

    expect(result.current.isSlowLoading).toBe(false);
    expect(result.current.hasTimedOut).toBe(false);

    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(result.current.isSlowLoading).toBe(true);
    expect(result.current.hasTimedOut).toBe(false);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.hasTimedOut).toBe(true);
  });

  it('resets timeout and slow-loading state when loading ends', () => {
    const { result, rerender } = renderHook(
      ({ loading }) =>
        useSafetyTimeout(loading, { timeout: 1200, slowThreshold: 500 }),
      { initialProps: { loading: true } }
    );

    act(() => {
      vi.advanceTimersByTime(1300);
    });
    expect(result.current.hasTimedOut).toBe(true);
    expect(result.current.isSlowLoading).toBe(true);

    rerender({ loading: false });
    expect(result.current.hasTimedOut).toBe(false);
    expect(result.current.isSlowLoading).toBe(false);
  });
});
