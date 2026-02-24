import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Enhanced debounce and throttle with cancel functionality
const debounce = (fn: Function, ms: number) => {
  let timer: NodeJS.Timeout;
  const debouncedFn = (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  debouncedFn.cancel = () => clearTimeout(timer);
  return debouncedFn;
};

const throttle = (fn: Function, ms: number) => {
  let timer: NodeJS.Timeout | null = null;
  const throttledFn = (...args: any[]) => {
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
      }, ms);
      fn(...args);
    }
  };
  throttledFn.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return throttledFn;
};

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const metricsRef = useRef<{
    renderCount: number;
    averageRenderTime: number;
    lastRenderTime: number;
  }>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: performance.now(),
  });

  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      metricsRef.current.renderCount++;
      metricsRef.current.averageRenderTime =
        (metricsRef.current.averageRenderTime + renderTime) / 2;
      metricsRef.current.lastRenderTime = renderTime;
    };
  });

  const getMetrics = useCallback(() => {
    return {
      ...metricsRef.current,
      isPerformant: metricsRef.current.averageRenderTime < 16, // 60fps threshold
    };
  }, []);

  return { getMetrics };
};

// Optimized scroll handling
export const useOptimizedScroll = (
  callback: (scrollY: number) => void,
  deps: any[] = []
) => {
  const throttledCallback = useMemo(
    () => throttle((scrollY: number) => callback(scrollY), 16), // ~60fps
    deps
  );

  useEffect(() => {
    const handleScroll = () => throttledCallback(window.scrollY);

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      throttledCallback.cancel();
    };
  }, [throttledCallback]);
};

// Optimized resize handling
export const useOptimizedResize = (
  callback: (width: number, height: number) => void,
  deps: any[] = []
) => {
  const debouncedCallback = useMemo(
    () =>
      debounce((width: number, height: number) => {
        callback(width, height);
      }, 150),
    deps
  );

  useEffect(() => {
    const handleResize = () => {
      debouncedCallback(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Call immediately with current dimensions
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);
};

// Virtual scrolling for large lists
export const useVirtualScrolling = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length - 1, end + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange,
  };
};

// Image loading optimization
export const useOptimizedImageLoading = () => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const loadingRef = useRef<Set<string>>(new Set());

  const preloadImage = useCallback(
    (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (loadedImages.has(src)) {
          resolve();
          return;
        }

        if (loadingRef.current.has(src)) {
          // Already loading, wait for it
          const checkLoaded = () => {
            if (loadedImages.has(src)) {
              resolve();
            } else {
              setTimeout(checkLoaded, 50);
            }
          };
          checkLoaded();
          return;
        }

        loadingRef.current.add(src);

        const img = new Image();
        img.onload = () => {
          setLoadedImages((prev) => new Set(prev).add(src));
          loadingRef.current.delete(src);
          resolve();
        };
        img.onerror = () => {
          loadingRef.current.delete(src);
          reject(new Error(`Failed to load image: ${src}`));
        };
        img.src = src;
      });
    },
    [loadedImages]
  );

  const preloadImages = useCallback(
    async (sources: string[]) => {
      const promises = sources.map((src) => preloadImage(src));
      await Promise.allSettled(promises);
    },
    [preloadImage]
  );

  const isLoaded = useCallback(
    (src: string) => {
      return loadedImages.has(src);
    },
    [loadedImages]
  );

  return {
    preloadImage,
    preloadImages,
    isLoaded,
    loadedCount: loadedImages.size,
  };
};

// Memory management for components
export const useMemoryOptimization = () => {
  const cleanupTasks = useRef<(() => void)[]>([]);

  const addCleanupTask = useCallback((task: () => void) => {
    cleanupTasks.current.push(task);
  }, []);

  useEffect(() => {
    return () => {
      cleanupTasks.current.forEach((task) => {
        try {
          task();
        } catch (error) {
          console.warn('Cleanup task failed:', error);
        }
      });
      cleanupTasks.current = [];
    };
  }, []);

  const clearMemory = useCallback(() => {
    // Force garbage collection if available (dev only)
    if (process.env.NODE_ENV === 'development' && window.gc) {
      window.gc();
    }
  }, []);

  return {
    addCleanupTask,
    clearMemory,
  };
};

// Bundle size optimization utilities
export const dynamicImport = <T>(
  importFn: () => Promise<{ default: T }>,
  fallback?: T
) => {
  return new Promise<T>((resolve) => {
    importFn()
      .then((module) => resolve(module.default))
      .catch(() => {
        if (fallback) {
          resolve(fallback);
        } else {
          throw new Error('Dynamic import failed and no fallback provided');
        }
      });
  });
};

// Critical resource loading
export const useCriticalResourceLoading = () => {
  const [criticalLoaded, setCriticalLoaded] = useState(false);
  const [nonCriticalLoaded, setNonCriticalLoaded] = useState(false);

  const loadCriticalResources = useCallback(async () => {
    // Load critical CSS, fonts, etc.
    const criticalTasks = [
      // Font loading
      document.fonts.ready,
      // Critical images
      new Promise((resolve) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve; // Continue even if failed
        img.src = '/assets/images/hero-image.jpg'; // Critical hero image
      }),
    ];

    await Promise.allSettled(criticalTasks);
    setCriticalLoaded(true);

    // Load non-critical resources after critical ones
    setTimeout(() => {
      setNonCriticalLoaded(true);
    }, 100);
  }, []);

  useEffect(() => {
    loadCriticalResources();
  }, [loadCriticalResources]);

  return {
    criticalLoaded,
    nonCriticalLoaded,
    loadCriticalResources,
  };
};
