import { useState, useEffect, useCallback } from 'react';
import { imageService } from '@/services/imageService';
import { ImageLoadState, ImageCategory } from '@/types/image.types';

/**
 * ADVANCED IMAGE LOADING HOOK
 * Provides intelligent image loading with cascading fallbacks
 */
export const useImageLoader = (
  originalSrc: string,
  category: ImageCategory = 'default',
  preload: boolean = false
) => {
  const [state, setState] = useState<ImageLoadState>({
    isLoading: true,
    hasError: false,
    attemptedSources: [],
    currentSrc: originalSrc,
  });

  const loadImage = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      hasError: false,
    }));

    try {
      const optimizedSrc = await imageService.getOptimizedSource(
        originalSrc,
        category
      );

      setState({
        isLoading: false,
        hasError: false,
        attemptedSources: [originalSrc],
        currentSrc: optimizedSrc,
      });
    } catch (error) {
      console.error('Image loading failed:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        hasError: true,
        currentSrc: '/placeholder.svg',
      }));
    }
  }, [originalSrc, category]);

  const handleError = useCallback(() => {
    const nextFallback = imageService.getNextFallback(
      state.currentSrc,
      category
    );

    if (nextFallback) {
      setState((prev) => ({
        ...prev,
        currentSrc: nextFallback,
        attemptedSources: [...prev.attemptedSources, prev.currentSrc],
      }));
    } else {
      setState((prev) => ({
        ...prev,
        hasError: true,
        isLoading: false,
      }));
    }
  }, [state.currentSrc, category]);

  const handleLoad = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      hasError: false,
    }));
  }, []);

  const retry = useCallback(() => {
    loadImage();
  }, [loadImage]);

  // Preload if requested
  useEffect(() => {
    if (preload) {
      imageService.preloadImages([originalSrc]);
    }
  }, [originalSrc, preload]);

  // Initialize loading
  useEffect(() => {
    loadImage();
  }, [loadImage]);

  return {
    ...state,
    handleError,
    handleLoad,
    retry,
  };
};
