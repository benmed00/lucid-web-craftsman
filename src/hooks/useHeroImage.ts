import { useState, useEffect } from 'react';
import { heroImageService, HeroImageData } from '@/services/heroImageService';

const defaultHeroImage: HeroImageData = {
  imageUrl: '/assets/images/home_page_image.webp',
  altText: 'Chapeau artisanal et sac traditionnel fait main - Artisanat authentique du Rif',
  title: 'Artisanat Authentique du Rif',
  subtitle: 'Chapeau tressé et sac naturel - Fait main avec amour'
};

export const useHeroImage = () => {
  const [heroImageData, setHeroImageData] = useState<HeroImageData>(defaultHeroImage);
  const [isLoading, setIsLoading] = useState(false); // Start with false to show default image immediately

  // Load hero image data on mount - but don't show loading state
  useEffect(() => {
    const loadHeroImage = async () => {
      try {
        const data = await heroImageService.get();
        // Only update if we got different data than default
        if (data.imageUrl !== defaultHeroImage.imageUrl) {
          setHeroImageData(data);
          
          // Add dynamic preload for LCP optimization
          if (data.imageUrl.includes('supabase.co/storage')) {
            const preloadLink = document.createElement('link');
            preloadLink.rel = 'preload';
            preloadLink.as = 'image';
            preloadLink.href = data.imageUrl;
            preloadLink.setAttribute('fetchpriority', 'high');
            
            // Only add if not already present
            const existingPreload = document.querySelector(`link[href="${data.imageUrl}"]`);
            if (!existingPreload) {
              document.head.appendChild(preloadLink);
            }
          }
        }
      } catch (error) {
        console.error('Error loading hero image:', error);
        // Keep default image on error
      }
    };

    loadHeroImage();
  }, []);

  const updateHeroImage = async (data: HeroImageData): Promise<void> => {
    try {
      let savedData: HeroImageData;
      
      if (data.id) {
        // Update existing
        savedData = await heroImageService.update(data.id, data);
      } else {
        // Create new
        savedData = await heroImageService.save(data);
      }
      
      setHeroImageData(savedData);
    } catch (error) {
      console.error('Error updating hero image:', error);
      throw error;
    }
  };

  const resetHeroImage = async (): Promise<void> => {
    try {
      await heroImageService.reset();
      setHeroImageData(defaultHeroImage);
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

  // Removed: window focus listener was triggering unnecessary Supabase queries
  // on every tab focus for all visitors. Hero image changes are admin-only
  // and will be picked up on next page load.

  return {
    heroImageData,
    isLoading,
    updateHeroImage,
    resetHeroImage,
    uploadImage
  };
};