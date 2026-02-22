// Enhanced image error handling to prevent console errors for SEO
// Handles broken Supabase storage URLs and provides fallbacks

const imageErrorCache = new Set<string>();
const retryAttempts = new Map<string, number>();

/**
 * Checks if an image URL is valid before attempting to load it
 */
export const validateImageUrl = async (url: string): Promise<boolean> => {
  // Check cache first
  if (imageErrorCache.has(url)) {
    return false;
  }

  try {
    const response = await fetch(url, { method: 'HEAD' });
    const isValid = response.ok;

    if (!isValid) {
      imageErrorCache.add(url);
    }

    return isValid;
  } catch {
    imageErrorCache.add(url);
    return false;
  }
};

/**
 * Generates fallback image URLs for Supabase storage
 */
export const generateImageFallbacks = (originalUrl: string): string[] => {
  const fallbacks: string[] = [];

  if (originalUrl.includes('supabase.co/storage')) {
    try {
      const url = new URL(originalUrl);

      // Remove problematic parameters
      url.searchParams.delete('resize');
      url.searchParams.delete('format');
      url.searchParams.delete('quality');

      // Add original without parameters
      fallbacks.push(url.toString());

      // Add with conservative quality only
      const qualityUrl = new URL(url);
      qualityUrl.searchParams.set('quality', '80');
      fallbacks.push(qualityUrl.toString());
    } catch {
      // If URL parsing fails, just use original
      fallbacks.push(originalUrl);
    }
  } else {
    fallbacks.push(originalUrl);
  }

  return fallbacks;
};

/**
 * Handles image loading with retries and fallbacks
 */
export const loadImageWithFallback = async (
  originalUrl: string,
  onSuccess: (url: string) => void,
  onError: () => void
): Promise<void> => {
  const fallbacks = generateImageFallbacks(originalUrl);

  for (const url of fallbacks) {
    try {
      const isValid = await validateImageUrl(url);
      if (isValid) {
        onSuccess(url);
        return;
      }
    } catch {
      continue;
    }
  }

  // All fallbacks failed
  onError();
};

/**
 * Preloads images and caches error results
 */
export const preloadImages = (urls: string[]): void => {
  urls.forEach(async (url) => {
    if (!imageErrorCache.has(url)) {
      try {
        await validateImageUrl(url);
      } catch {
        // Validation will handle caching
      }
    }
  });
};

/**
 * Clears error cache periodically
 */
export const clearImageErrorCache = (): void => {
  imageErrorCache.clear();
  retryAttempts.clear();
};

// Clear cache every hour
if (typeof window !== 'undefined') {
  setInterval(clearImageErrorCache, 60 * 60 * 1000);
}
