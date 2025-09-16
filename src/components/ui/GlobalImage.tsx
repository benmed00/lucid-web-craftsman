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
  sizes?: string;
  quality?: number;
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
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  quality = 80,
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

      {/* Main image with WebP support and responsive sizing */}
      <picture className="w-full h-full">
        {/* WebP source for modern browsers with quality optimization */}
        {currentSrc.includes('supabase.co/storage') && (
          <source 
            srcSet={`${currentSrc}?format=webp&quality=${quality}&resize=1920x1080`}
            type="image/webp"
            sizes={sizes}
          />
        )}
        {currentSrc.startsWith('/assets/') && !currentSrc.includes('.webp') && (
          <source 
            srcSet={currentSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp')}
            type="image/webp"
            sizes={sizes}
          />
        )}
        
        {/* Fallback img element with responsive sizing */}
        <img
          ref={ref}
          src={currentSrc.includes('supabase.co/storage') ? 
            `${currentSrc}?quality=${quality}&resize=1920x1080` : 
            currentSrc
          }
          alt={alt}
          sizes={sizes}
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
      </picture>
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
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      quality={85}
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
      sizes="100vw"
      quality={90}
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
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 300px"
      quality={75}
      {...props} 
    />
  )
);

InstagramImage.displayName = "InstagramImage";