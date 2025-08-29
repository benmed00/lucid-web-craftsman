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
      "/assets/images/sacs/sac_traditionnel.jpg",
      "/assets/images/products/sac_a_main_tisse_traditionnel.jpg", 
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
      "/assets/images/instagram/insta_image_1.jpg",
      "/assets/images/instagram/insta_image_2.webp",
      "/assets/images/instagram/insta_image_3.jpg",
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

    // Handle absolute URLs
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
   * Get optimized image source with fallback cascade
   */
  async getOptimizedSource(originalSrc: string, category: ImageCategory = 'default'): Promise<string> {
    const normalizedSrc = this.normalizeUrl(originalSrc);
    
    // Clear cache for this specific image to ensure fresh loading
    this.imageCache.delete(normalizedSrc);
    
    // Try original source first
    const isOriginalValid = await this.checkImage(normalizedSrc);
    if (isOriginalValid) {
      return normalizedSrc;
    }

    // Try fallbacks in order
    const fallbacks = this.getFallbacks(category);
    for (const fallback of fallbacks) {
      const isValid = await this.checkImage(fallback);
      if (isValid) {
        // Silent fallback for production
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