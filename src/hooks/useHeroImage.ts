import { useState, useEffect } from 'react';
import { heroImageService, HeroImageData } from '@/services/heroImageService';

const HERO_CACHE_KEY = 'rif_hero_image_cache';

const defaultHeroImage: HeroImageData = {
  imageUrl: '/assets/images/home_page_image.webp',
  altText:
    'Chapeau artisanal et sac traditionnel fait main - Artisanat authentique du Rif',
  title: 'Artisanat Authentique du Rif',
  subtitle: 'Chapeau tressé et sac naturel - Fait main avec amour',
};

/**
 * Try to restore the last known hero image from localStorage.
 * This prevents showing the wrong default (hat) when the real hero (bag)
 * was already fetched in a previous session.
 */
function getInitialHeroImage(): HeroImageData {
  try {
    const cached = localStorage.getItem(HERO_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as HeroImageData;
      // Basic validation
      if (parsed.imageUrl && parsed.title) {
        return parsed;
      }
    }
  } catch {
    // Corrupted cache — ignore
  }
  return defaultHeroImage;
}

function persistHeroImage(data: HeroImageData): void {
  try {
    localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable — non-critical
  }
}

export const useHeroImage = () => {
  const [heroImageData, setHeroImageData] =
    useState<HeroImageData>(getInitialHeroImage);
  // Start as NOT loading — we show the cached/default image immediately.
  // The Supabase fetch is deferred to avoid competing with product queries.
  const [isLoading, _setIsLoading] = useState(false);

  // Defer the Supabase fetch so product queries get priority.
  // Hero image is non-critical because we always have a localStorage
  // cached version or a sensible default.
  useEffect(() => {
    let cancelled = false;

    // Wait 3 seconds before fetching from Supabase to free connection
    // slots for critical product data during initial page load.
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const data = await heroImageService.get();
        if (cancelled) return;

        // Only update if different from current (avoid flash)
        if (data.imageUrl !== heroImageData.imageUrl) {
          setHeroImageData(data);
        }
        persistHeroImage(data);

        // Add dynamic preload for LCP optimization
        if (data.imageUrl.includes('supabase.co/storage')) {
          const preloadLink = document.createElement('link');
          preloadLink.rel = 'preload';
          preloadLink.as = 'image';
          preloadLink.href = data.imageUrl;
          preloadLink.setAttribute('fetchpriority', 'high');

          const existingPreload = document.querySelector(
            `link[href="${data.imageUrl}"]`
          );
          if (!existingPreload) {
            document.head.appendChild(preloadLink);
          }
        }
      } catch (error) {
        console.error('Error loading hero image:', error);
        // Keep cached or default image on error
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const updateHeroImage = async (data: HeroImageData): Promise<void> => {
    try {
      let savedData: HeroImageData;

      if (data.id) {
        savedData = await heroImageService.update(data.id, data);
      } else {
        savedData = await heroImageService.save(data);
      }

      setHeroImageData(savedData);
      persistHeroImage(savedData);
    } catch (error) {
      console.error('Error updating hero image:', error);
      throw error;
    }
  };

  const resetHeroImage = async (): Promise<void> => {
    try {
      await heroImageService.reset();
      setHeroImageData(defaultHeroImage);
      localStorage.removeItem(HERO_CACHE_KEY);
    } catch (error) {
      console.error('Error resetting hero image:', error);
      throw error;
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    try {
      return await heroImageService.uploadImage(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  return {
    heroImageData,
    isLoading,
    updateHeroImage,
    resetHeroImage,
    uploadImage,
  };
};
