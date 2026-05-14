/**
 * Tests for performance helpers.
 *
 * Prerequisites: fake timers for throttle/debounce; jsdom for window events
 * and `new Image()`.
 * Run: npx vitest run src/hooks/usePerformanceOptimization.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useOptimizedScroll,
  useOptimizedResize,
  useVirtualScrolling,
  useMemoryOptimization,
  useOptimizedImageLoading,
  usePerformanceMonitor,
  useCriticalResourceLoading,
} from './usePerformanceOptimization';

describe('useOptimizedScroll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 0,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('forwards scrollY through the throttled callback', () => {
    const cb = vi.fn();
    renderHook(() => useOptimizedScroll(cb, []));

    // First scroll fires immediately because the throttle leading edge.
    act(() => {
      window.scrollY = 100;
      window.dispatchEvent(new Event('scroll'));
    });
    expect(cb).toHaveBeenCalledWith(100);
  });
});

describe('useOptimizedResize', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces resize bursts and reports the last dimensions', () => {
    const cb = vi.fn();
    renderHook(() => useOptimizedResize(cb, []));

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1000,
        configurable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 800,
        configurable: true,
      });
      window.dispatchEvent(new Event('resize'));
    });
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1200,
        configurable: true,
      });
      window.dispatchEvent(new Event('resize'));
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(cb).toHaveBeenCalledWith(1200, 800);
  });
});

describe('useVirtualScrolling', () => {
  it('computes the visible window for a tall list', () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    const { result } = renderHook(() => useVirtualScrolling(items, 20, 200, 5));

    expect(result.current.totalHeight).toBe(20000);
    expect(result.current.offsetY).toBe(0);
    expect(result.current.visibleItems.length).toBeLessThan(items.length);
    expect(result.current.visibleRange.start).toBe(0);
  });

  it('shifts the window after a scroll event', () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    const { result } = renderHook(() => useVirtualScrolling(items, 20, 200, 0));

    act(() => {
      result.current.handleScroll({
        currentTarget: { scrollTop: 200 } as HTMLDivElement,
      } as unknown as React.UIEvent<HTMLDivElement>);
    });

    expect(result.current.offsetY).toBe(200);
    expect(result.current.visibleRange.start).toBe(10);
  });
});

describe('useMemoryOptimization', () => {
  it('runs registered cleanup tasks on unmount', () => {
    const a = vi.fn();
    const b = vi.fn();

    const { result, unmount } = renderHook(() => useMemoryOptimization());
    act(() => {
      result.current.addCleanupTask(a);
      result.current.addCleanupTask(b);
    });

    unmount();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('swallows errors thrown by a cleanup task and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ok = vi.fn();
    const boom = vi.fn(() => {
      throw new Error('boom');
    });

    const { result, unmount } = renderHook(() => useMemoryOptimization());
    act(() => {
      result.current.addCleanupTask(boom);
      result.current.addCleanupTask(ok);
    });
    unmount();

    expect(boom).toHaveBeenCalled();
    expect(ok).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('useOptimizedImageLoading', () => {
  it('marks an image as loaded after Image.onload fires', async () => {
    // Patch the Image constructor to expose its instance + manually trigger onload.
    const original = window.Image;
    const instances: HTMLImageElement[] = [];
    Object.defineProperty(window, 'Image', {
      writable: true,
      configurable: true,
      value: class FakeImage {
        public onload: (() => void) | null = null;
        public onerror: (() => void) | null = null;
        private _src = '';
        get src() {
          return this._src;
        }
        set src(v: string) {
          this._src = v;
          instances.push(this as unknown as HTMLImageElement);
        }
      },
    });

    const { result } = renderHook(() => useOptimizedImageLoading());

    let preload: Promise<void> | undefined;
    act(() => {
      preload = result.current.preloadImage('/x.webp');
    });

    // Fire onload on the constructed image
    await act(async () => {
      const img = instances[instances.length - 1] as unknown as {
        onload: (() => void) | null;
      };
      img.onload?.();
      await preload;
    });

    expect(result.current.isLoaded('/x.webp')).toBe(true);
    expect(result.current.loadedCount).toBe(1);

    Object.defineProperty(window, 'Image', {
      writable: true,
      configurable: true,
      value: original,
    });
  });
});

describe('usePerformanceMonitor', () => {
  it('increments renderCount when the hook re-renders', () => {
    const { result, rerender } = renderHook(() => usePerformanceMonitor());
    const before = result.current.getMetrics().renderCount;
    rerender();
    expect(result.current.getMetrics().renderCount).toBeGreaterThanOrEqual(
      before
    );
  });
});

describe('useCriticalResourceLoading', () => {
  it('eventually marks critical resources loaded', async () => {
    const originalImage = window.Image;
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    Object.defineProperty(window, 'Image', {
      writable: true,
      configurable: true,
      value: class Img {
        onload: ((ev: unknown) => void) | null = null;
        onerror: ((ev: unknown) => void) | null = null;
        set src(_: string) {
          queueMicrotask(() => this.onload?.(null));
        }
        get src() {
          return '';
        }
      },
    });

    try {
      const { result } = renderHook(() => useCriticalResourceLoading());
      await waitFor(() => expect(result.current.criticalLoaded).toBe(true), {
        timeout: 4000,
      });
      await waitFor(() => expect(result.current.nonCriticalLoaded).toBe(true), {
        timeout: 4000,
      });
    } finally {
      Object.defineProperty(window, 'Image', {
        writable: true,
        configurable: true,
        value: originalImage,
      });
    }
  });
});
