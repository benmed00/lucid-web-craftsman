import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useImageLoader } from "@/hooks/useImageLoader";
import { ImageConfig, ImageCategory } from "@/types/image.types";

/**
 * UNIVERSAL GLOBAL IMAGE COMPONENT
 * This component replaces ALL image usage across the application
 * Provides consistent loading, error handling, and fallback behavior
 */
interface GlobalImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src: string;
  alt: string;
  category?: ImageCategory;
  fallbackText?: string;
  showLoadingSpinner?: boolean;
  showRetryButton?: boolean;
  preload?: boolean;
  aspectRatio?: string;
  errorClassName?: string;
}

export const GlobalImage = forwardRef<HTMLImageElement, GlobalImageProps>(({
  src,
  alt,
  category = 'default',
  className,
  fallbackText,
  showLoadingSpinner = true,
  showRetryButton = false,
  preload = false,
  aspectRatio,
  errorClassName,
  ...props
}, ref) => {
  const { 
    currentSrc, 
    isLoading, 
    hasError, 
    handleError, 
    handleLoad, 
    retry 
  } = useImageLoader(src, category, preload);

  // Error state with optional retry
  if (hasError && !currentSrc.includes('placeholder.svg')) {
    return (
      <div 
        className={cn(
          "flex flex-col items-center justify-center bg-stone-100 text-stone-500 text-sm p-4",
          aspectRatio && `aspect-${aspectRatio}`,
          errorClassName || className
        )}
      >
        <div className="text-center">
          <p className="mb-2">{fallbackText || "Image non disponible"}</p>
          {showRetryButton && (
            <button 
              onClick={retry}
              className="text-xs text-olive-600 hover:text-olive-700 underline"
            >
              Réessayer
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full", aspectRatio && `aspect-${aspectRatio}`)}>
      {/* Loading spinner */}
      {isLoading && showLoadingSpinner && (
        <div className={cn(
          "absolute inset-0 bg-stone-100 flex items-center justify-center",
          className
        )}>
          <div className="w-6 h-6 border-2 border-stone-300 border-t-olive-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Main image */}
      <img
        ref={ref}
        src={currentSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={preload ? "eager" : "lazy"}
        {...props}
      />
    </div>
  );
});

GlobalImage.displayName = "GlobalImage";

/**
 * SPECIALIZED IMAGE COMPONENTS FOR DIFFERENT USE CASES
 */

// Product image with optimized settings
export const ProductImage = forwardRef<HTMLImageElement, Omit<GlobalImageProps, 'category'>>(
  (props, ref) => (
    <GlobalImage 
      ref={ref} 
      category="product" 
      preload={true}
      showRetryButton={true}
      {...props} 
    />
  )
);

ProductImage.displayName = "ProductImage";

// Hero image with optimized settings
export const HeroImage = forwardRef<HTMLImageElement, Omit<GlobalImageProps, 'category'>>(
  (props, ref) => (
    <GlobalImage 
      ref={ref} 
      category="hero" 
      preload={true}
      showLoadingSpinner={true}
      {...props} 
    />
  )
);

HeroImage.displayName = "HeroImage";

// Blog image with optimized settings
export const BlogImage = forwardRef<HTMLImageElement, Omit<GlobalImageProps, 'category'>>(
  (props, ref) => (
    <GlobalImage 
      ref={ref} 
      category="blog" 
      preload={false}
      {...props} 
    />
  )
);

BlogImage.displayName = "BlogImage";

// Instagram image with optimized settings
export const InstagramImage = forwardRef<HTMLImageElement, Omit<GlobalImageProps, 'category'>>(
  (props, ref) => (
    <GlobalImage 
      ref={ref} 
      category="instagram" 
      preload={false}
      showLoadingSpinner={false}
      {...props} 
    />
  )
);

InstagramImage.displayName = "InstagramImage";