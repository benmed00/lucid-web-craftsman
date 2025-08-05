import { useState, useEffect } from 'react';
import { heroImageService, HeroImageData } from '@/services/heroImageService';

export const useHeroImage = () => {
  const [heroImageData, setHeroImageData] = useState<HeroImageData>(
    heroImageService.get()
  );

  const updateHeroImage = (data: HeroImageData) => {
    heroImageService.save(data);
    setHeroImageData(data);
  };

  const resetHeroImage = () => {
    heroImageService.reset();
    setHeroImageData(heroImageService.get());
  };

  // Listen for storage changes (when updated from admin panel)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'heroImageData') {
        setHeroImageData(heroImageService.get());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    heroImageData,
    updateHeroImage,
    resetHeroImage
  };
};