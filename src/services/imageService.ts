import { ImageFallbackConfig, ImageCategory } from "@/types/image.types";

/**
 * CENTRALIZED IMAGE SERVICE - HANDLES ALL IMAGE OPERATIONS
 * This service provides a single source of truth for image handling across the entire application
 */
class ImageService {
  private static instance: ImageService;
  private imageCache = new Map<string, boolean>();
  private preloadQueue = new Set<string>();

  // Comprehensive fallback system with actual available images
  private readonly fallbackConfig: ImageFallbackConfig = {
    product: [
      "/assets/images/handmade_products.webp",
      "/placeholder.svg"
    ],
    hero: [
      "/assets/images/home_page_image.webp", 
      "/assets/images/handmade_products.webp",
      "/placeholder.svg"
    ],
    blog: [
      "/assets/images/blog/tissage.jpg",
      "/assets/images/blog/fibre_vegetal.jpg", 
      "/assets/images/blog/symboles_berberes.webp",
      "/placeholder.svg"
    ],
    instagram: [
      "/assets/images/instagram/insta_image_1.webp",
      "/assets/images/instagram/insta_image_2.webp",
      "/assets/images/instagram/insta_image_3.webp",
      "/assets/images/instagram/insta_image_4.webp",
      "/assets/images/instagram/insta_image_1.jpg",
      "/assets/images/instagram/insta_image_4.jpg",
      "/placeholder.svg"
    ],
    avatar: [
      "/assets/images/handmade_products.webp",
      "/placeholder.svg"
    ],
    default: [
      "/placeholder.svg"
    ]
  };

  static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService();
    }
    return ImageService.instance;
  }

  /**
   * Normalize image URL - handles relative paths, validates URLs
   */
  normalizeUrl(src: string): string {
    if (!src || src.trim() === '') {
      return this.fallbackConfig.default[0];
    }

    // Handle Supabase storage URLs (keep as-is)
    if (src.startsWith('https://') && src.includes('supabase.co/storage')) {
      return src;
    }

    // Handle other absolute URLs
    if (src.startsWith('http') || src.startsWith('//')) {
      return src;
    }

    // Handle relative URLs
    if (src.startsWith('/')) {
      return src;
    }

    // Handle assets without leading slash
    return `/${src}`;
  }

  /**
   * Get fallback images for a specific category
   */
  getFallbacks(category: ImageCategory = 'default'): string[] {
    return this.fallbackConfig[category] || this.fallbackConfig.default;
  }

  /**
   * Get the next fallback image when current one fails
   */
  getNextFallback(currentSrc: string, category: ImageCategory = 'default'): string | null {
    const fallbacks = this.getFallbacks(category);
    const currentIndex = fallbacks.indexOf(currentSrc);
    
    if (currentIndex === -1) {
      return fallbacks[0];
    }
    
    if (currentIndex < fallbacks.length - 1) {
      return fallbacks[currentIndex + 1];
    }
    
    return null;
  }

  /**
   * Check if image exists and is loadable
   */
  async checkImage(src: string): Promise<boolean> {
    const normalizedSrc = this.normalizeUrl(src);
    
    // Check cache first
    if (this.imageCache.has(normalizedSrc)) {
      return this.imageCache.get(normalizedSrc)!;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        this.imageCache.set(normalizedSrc, false);
        resolve(false);
      }, 3000); // Reduced timeout to 3 seconds

      img.onload = () => {
        clearTimeout(timeout);
        img.onerror = null;
        this.imageCache.set(normalizedSrc, true);
        resolve(true);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        img.onload = null;
        this.imageCache.set(normalizedSrc, false);
        resolve(false);
      };

      img.src = normalizedSrc;
    });
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(sources: string[]): Promise<void> {
    const uniqueSources = [...new Set(sources.map(src => this.normalizeUrl(src)))];
    
    const preloadPromises = uniqueSources.map(async (src) => {
      if (!this.preloadQueue.has(src)) {
        this.preloadQueue.add(src);
        await this.checkImage(src);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Check browser support for WebP format
   */
  private supportWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Generate WebP version URL for optimization
   */
  private getWebPVersion(src: string): string {
    // For Supabase storage URLs, try to request WebP if supported
    if (src.includes('supabase.co/storage') && this.supportWebP()) {
      // Add WebP transformation for Supabase images
      const url = new URL(src);
      url.searchParams.set('format', 'webp');
      url.searchParams.set('quality', '80');
      return url.toString();
    }
    
    // For local assets, try to find WebP equivalent
    if (src.startsWith('/assets/') && this.supportWebP()) {
      // Convert .jpg, .jpeg, .png to .webp
      const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      return webpSrc;
    }
    
    return src;
  }

  /**
   * Get optimized image source with WebP preference and fallback cascade
   */
  async getOptimizedSource(originalSrc: string, category: ImageCategory = 'default'): Promise<string> {
    const normalizedSrc = this.normalizeUrl(originalSrc);
    
    // Try WebP version first if browser supports it
    if (this.supportWebP()) {
      const webpSrc = this.getWebPVersion(normalizedSrc);
      if (webpSrc !== normalizedSrc) {
        const isWebPValid = await this.checkImage(webpSrc);
        if (isWebPValid) {
          return webpSrc;
        }
      }
    }
    
    // Try original source
    const isOriginalValid = await this.checkImage(normalizedSrc);
    if (isOriginalValid) {
      return normalizedSrc;
    }

    // Try fallbacks in order, with WebP preference
    const fallbacks = this.getFallbacks(category);
    for (const fallback of fallbacks) {
      // Try WebP version of fallback first
      if (this.supportWebP()) {
        const webpFallback = this.getWebPVersion(fallback);
        if (webpFallback !== fallback) {
          const isWebPValid = await this.checkImage(webpFallback);
          if (isWebPValid) {
            return webpFallback;
          }
        }
      }
      
      // Try original fallback
      const isValid = await this.checkImage(fallback);
      if (isValid) {
        return fallback;
      }
    }

    // Last resort - silent fallback for production
    return '/placeholder.svg';
  }

  /**
   * Clear cache - useful for testing or when images are updated
   */
  clearCache(): void {
    this.imageCache.clear();
    this.preloadQueue.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { cached: number; queued: number } {
    return {
      cached: this.imageCache.size,
      queued: this.preloadQueue.size
    };
  }
}

// Export singleton instance
export const imageService = ImageService.getInstance();