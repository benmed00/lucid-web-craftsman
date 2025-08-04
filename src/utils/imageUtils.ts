import { useState, useCallback, useEffect } from "react";

// Image optimization and fallback utilities
export const ImageUtils = {
  // Convert relative paths to absolute paths
  getImageUrl: (imagePath: string): string => {
    if (!imagePath) return "/placeholder.svg";
    
    // If already absolute URL, return as is
    if (imagePath.startsWith("http") || imagePath.startsWith("//")) {
      return imagePath;
    }
    
    // Convert relative path to absolute
    return imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  },

  // Get placeholder image for specific categories
  getPlaceholderForCategory: (category: string): string => {
    const placeholders: Record<string, string> = {
      "Sacs": "/assets/images/handmade_products.webp",
      "Chapeaux": "/assets/images/home_page_image.webp",
      "default": "/placeholder.svg"
    };
    
    return placeholders[category] || placeholders.default;
  },

  // Preload images for better performance
  preloadImage: (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  },

  // Batch preload multiple images
  preloadImages: async (imagePaths: string[]): Promise<void> => {
    const promises = imagePaths.map(path => 
      ImageUtils.preloadImage(ImageUtils.getImageUrl(path))
    );
    
    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.warn("Some images failed to preload:", error);
    }
  }
};

// Hook for managing image gallery state
export const useImageGallery = (images: string[]) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const selectImage = useCallback((index: number) => {
    if (index >= 0 && index < images.length) {
      setSelectedIndex(index);
    }
  }, [images.length]);

  const nextImage = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Preload all images when component mounts
  useEffect(() => {
    ImageUtils.preloadImages(images).finally(() => {
      setIsLoading(false);
    });
  }, [images]);

  return {
    selectedIndex,
    selectedImage: images[selectedIndex],
    selectImage,
    nextImage,
    prevImage,
    isLoading
  };
};