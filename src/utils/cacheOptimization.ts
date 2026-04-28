// Cache optimization utilities for SEO performance
// Prevents duplicate image requests and optimizes resource loading

import { resolveSupabaseOrigin } from '@/integrations/supabase/resolveSupabaseOrigin';

// Image URL deduplication to prevent loading same image multiple times
const imageUrlCache = new Map<string, string>();

/**
 * Optimizes image URL by normalizing parameters and preventing duplicates
 */
export const optimizeImageUrl = (url: string): string => {
  if (!url) return url;

  // Create a normalized version of the URL
  const urlObj = new URL(url);
  const params = new URLSearchParams(urlObj.search);

  // Sort parameters for consistent URLs and prevent duplicates
  const sortedParams = new URLSearchParams();
  const paramMap = new Map<string, string>();

  // First pass: collect unique parameters (latest value wins)
  Array.from(params.entries()).forEach(([key, value]) => {
    paramMap.set(key, value);
  });

  // Second pass: sort and add to final params
  Array.from(paramMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => {
      sortedParams.append(key, value);
    });

  // Reconstruct URL with sorted parameters
  urlObj.search = sortedParams.toString();
  const optimizedUrl = urlObj.toString();

  // Cache the optimized URL
  if (!imageUrlCache.has(url)) {
    imageUrlCache.set(url, optimizedUrl);
  }

  return optimizedUrl;
};

/**
 * Preloads critical images with optimized caching
 */
export const preloadCriticalImages = (imageUrls: string[]): void => {
  if (typeof window === 'undefined') return;

  imageUrls.forEach((url) => {
    const optimizedUrl = optimizeImageUrl(url);

    // Check if already preloaded
    if (document.querySelector(`link[href="${optimizedUrl}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = optimizedUrl;
    link.crossOrigin = 'anonymous';

    // Add cache hints
    link.setAttribute('importance', 'high');

    document.head.appendChild(link);
  });
};

/**
 * Registers service worker for enhanced caching.
 *
 * Not invoked from `main.tsx` today: boot-time SW unregister must not be
 * followed by registration (stale order / invoice JS). Call only if you reintroduce
 * SW with a versioned cache strategy and exclude payment routes.
 */
export const registerServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const pathname = window.location.pathname;
  const isCriticalFlow =
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/payment-success') ||
    pathname.startsWith('/order-confirmation') ||
    pathname.startsWith('/invoice') ||
    pathname.startsWith('/admin');

  if (isCriticalFlow) {
    await disableServiceWorkerForCriticalFlow();
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('ServiceWorker registered:', registration);

    // Service worker registered successfully
  } catch (error) {
    console.log('ServiceWorker registration failed:', error);
  }
};

/**
 * Critical checkout/payment routes must never serve stale SW state.
 */
export const disableServiceWorkerForCriticalFlow = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister())
    );
  } catch {
    // ignore
  }

  if ('caches' in window) {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    } catch {
      // ignore
    }
  }
};

/**
 * Optimizes resource hints for better caching
 */
export const addResourceHints = (): void => {
  if (typeof document === 'undefined') return;

  const supabaseHost = (() => {
    try {
      return new URL(resolveSupabaseOrigin()).host;
    } catch {
      return 'xcvlijchkmhjonhfildm.supabase.co';
    }
  })();

  // DNS prefetch for external domains
  const domains = [
    supabaseHost,
    'js.stripe.com',
    'm.stripe.network',
  ];

  domains.forEach((domain) => {
    if (!document.querySelector(`link[href="//${domain}"]`)) {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    }
  });

  // Preconnect to critical domains
  const criticalDomains = [supabaseHost];

  criticalDomains.forEach((domain) => {
    if (
      !document.querySelector(
        `link[href="https://${domain}"][rel="preconnect"]`
      )
    ) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = `https://${domain}`;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  });
};

/**
 * Cache-aware image component props
 */
export interface OptimizedImageProps {
  src: string;
  alt: string;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  importance?: 'high' | 'low' | 'auto';
}

/**
 * Creates optimized image props for better caching and performance
 */
export const createOptimizedImageProps = (
  src: string,
  alt: string,
  priority: boolean = false
): OptimizedImageProps => {
  return {
    src: optimizeImageUrl(src),
    alt,
    loading: priority ? 'eager' : 'lazy',
    decoding: 'async',
    importance: priority ? 'high' : 'auto',
  };
};

/**
 * Cache performance monitoring
 */
export const monitorCachePerformance = (): void => {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return;
  }

  // Monitor resource timing for cache hits
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      const resourceEntry = entry as PerformanceResourceTiming;

      // Log cache performance metrics (development only)
      if (process.env.NODE_ENV === 'development') {
        console.log(`Resource: ${resourceEntry.name}`);
        console.log(
          `Cache hit: ${resourceEntry.transferSize === 0 ? 'YES' : 'NO'}`
        );
        console.log(`Duration: ${resourceEntry.duration}ms`);
      }
    });
  });

  observer.observe({ entryTypes: ['resource'] });
};
