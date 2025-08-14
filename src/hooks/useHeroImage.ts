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
  const [isLoading, setIsLoading] = useState(true);

  // Load hero image data on mount
  useEffect(() => {
    const loadHeroImage = async () => {
      try {
        setIsLoading(true);
        const data = await heroImageService.get();
        setHeroImageData(data);
      } catch (error) {
        console.error('Error loading hero image:', error);
        setHeroImageData(defaultHeroImage);
      } finally {
        setIsLoading(false);
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

  // Listen for real-time updates (optional - for when multiple admins)
  useEffect(() => {
    const handleStorageChange = async () => {
      try {
        const data = await heroImageService.get();
        setHeroImageData(data);
      } catch (error) {
        console.error('Error reloading hero image:', error);
      }
    };

    // Could implement real-time subscriptions here if needed
    // For now, we'll just reload on window focus
    window.addEventListener('focus', handleStorageChange);
    return () => window.removeEventListener('focus', handleStorageChange);
  }, []);

  return {
    heroImageData,
    isLoading,
    updateHeroImage,
    resetHeroImage,
    uploadImage
  };
};