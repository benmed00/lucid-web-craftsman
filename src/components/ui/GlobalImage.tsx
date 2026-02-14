import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useImageLoader } from "@/hooks/useImageLoader";
import { ImageConfig, ImageCategory } from "@/types/image.types";

/**
 * UNIVERSAL GLOBAL IMAGE COMPONENT
 * This component replaces ALL image usage across the application
 * Provides consistent loading, error handling, and fallback behavior
 */
interface GlobalImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
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

export const GlobalImage = forwardRef<HTMLImageElement, GlobalImageProps>(
  (
    {
      src,
      alt,
      category = "default",
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
    },
    ref,
  ) => {
    const { currentSrc, isLoading, hasError, handleError, handleLoad, retry } = useImageLoader(src, category, preload);

    // Error state with optional retry
    if (hasError && !currentSrc.includes("placeholder.svg")) {
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center bg-muted text-muted-foreground text-sm p-4",
            aspectRatio && `aspect-${aspectRatio}`,
            errorClassName || className,
          )}
        >
          <div className="text-center">
            <p className="mb-2">{fallbackText || "Image non disponible"}</p>
            {showRetryButton && (
              <button onClick={retry} className="text-xs text-primary hover:text-primary/80 underline">
                Réessayer
              </button>
            )}
          </div>
        </div>
      );
    }

    // Enhanced image URL generation with proper sizing and deduplication
    const generateSafeImageUrl = (url: string, includeTransformations: boolean = true): string => {
      // Do not transform Supabase storage URLs to avoid 400s in preview
      if (url.includes("supabase.co/storage")) {
        return url;
      }
      if (!url.includes("supabase.co/storage")) {
        return url;
      }

      try {
        // Clean malformed URLs with duplicate query parameters
        let cleanUrl = url;
        const duplicatePattern = /(\?[^?]*)\?/g;
        if (duplicatePattern.test(url)) {
          const [baseUrl, ...queryParts] = url.split("?");
          const combinedParams = new URLSearchParams();

          // Combine all query parameters, with later ones overriding earlier ones
          queryParts.forEach((part) => {
            const params = new URLSearchParams(part);
            params.forEach((value, key) => {
              combinedParams.set(key, value);
            });
          });

          cleanUrl = `${baseUrl}?${combinedParams.toString()}`;
        }

        const urlObj = new URL(cleanUrl);

        // Check existing parameters
        const hasFormat = urlObj.searchParams.has("format");
        const hasQuality = urlObj.searchParams.has("quality");
        const hasWidth = urlObj.searchParams.has("width");
        const hasHeight = urlObj.searchParams.has("height");

        // Only add transformations if needed and requested
        if (includeTransformations) {
          // Add WebP format if not present
          if (!hasFormat) {
            urlObj.searchParams.set("format", "webp");
          }

          // Add appropriate sizing based on category
          if (!hasWidth || !hasHeight) {
            let width = 800,
              height = 600; // default
            if (category === "hero") {
              width = 1200;
              height = 800;
            } else if (category === "product") {
              width = 600;
              height = 450;
            } else if (category === "instagram") {
              width = 400;
              height = 400;
            }
            urlObj.searchParams.set("width", String(width));
            urlObj.searchParams.set("height", String(height));
          }

          // Add quality only if not present and within reasonable range
          if (!hasQuality && quality && quality <= 85) {
            urlObj.searchParams.set("quality", Math.min(quality, 75).toString());
          }
        }

        return urlObj.toString();
      } catch {
        return url;
      }
    };

    const generateWebPUrl = (url: string): string => {
      if (!url.includes("supabase.co/storage")) {
        return url;
      }

      try {
        // Use the same deduplication logic first
        const cleanedUrl = generateSafeImageUrl(url, false);
        const urlObj = new URL(cleanedUrl);

        // Don't generate WebP if already optimized with format
        if (urlObj.searchParams.has("format")) {
          return cleanedUrl;
        }

        // Add WebP format and appropriate sizing
        urlObj.searchParams.set("format", "webp");

        // Add responsive sizing if not present
        if (!urlObj.searchParams.has("width") || !urlObj.searchParams.has("height")) {
          let width = 800,
            height = 600;
          if (category === "hero") {
            width = 1200;
            height = 800;
          } else if (category === "product") {
            width = 600;
            height = 450;
          } else if (category === "instagram") {
            width = 400;
            height = 400;
          }
          urlObj.searchParams.set("width", String(width));
          urlObj.searchParams.set("height", String(height));
        }

        // Add conservative quality if not present
        if (!urlObj.searchParams.has("quality") && quality && quality <= 80) {
          urlObj.searchParams.set("quality", "70");
        }

        return urlObj.toString();
      } catch {
        return url;
      }
    };

    return (
      <div className={cn("relative w-full h-full", aspectRatio && `aspect-${aspectRatio}`)}>
        {/* Loading spinner */}
        {isLoading && showLoadingSpinner && (
          <div className={cn("absolute inset-0 bg-stone-100 flex items-center justify-center", className)}>
            <div className="w-6 h-6 border-2 border-stone-300 border-t-olive-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Only generate WebP source if the current source isn't already optimized */}
        <picture className="w-full h-full">
          {/* Only add WebP source for Supabase /render/image/ endpoint which supports transformation */}
          {currentSrc.includes("supabase.co/storage") &&
            currentSrc.includes("/render/image/") &&
            !currentSrc.includes("format=webp") && (
              <source srcSet={generateWebPUrl(currentSrc)} type="image/webp" sizes={sizes} />
            )}
          {/* Static asset WebP conversion - only if the image already ends with .webp */}
          {/* We don't auto-convert jpg/png since webp versions may not exist */}

          {/* Fallback img element with safe URL generation */}
          <img
            ref={ref}
            src={generateSafeImageUrl(currentSrc)}
            alt={alt}
            sizes={sizes}
            className={cn(
              "w-full h-full object-cover",
              // Remove transition for hero images to optimize LCP
              category === "hero" ? "" : "transition-opacity duration-300",
              category === "hero" ? "opacity-100" : isLoading ? "opacity-0" : "opacity-100",
              className,
            )}
            onLoad={handleLoad}
            onError={handleError}
            loading={preload ? "eager" : "lazy"}
            decoding={preload ? "sync" : "async"}
            // Use lowercase 'fetchpriority' to avoid React DOM warning
            // React doesn't recognize camelCase 'fetchPriority' and warns
            {...(category === "hero" ? { fetchpriority: "high" } : {})}
            {...props}
          />
        </picture>
      </div>
    );
  },
);

GlobalImage.displayName = "GlobalImage";

/**
 * SPECIALIZED IMAGE COMPONENTS FOR DIFFERENT USE CASES
 */

// Product image with optimized settings
export const ProductImage = forwardRef<HTMLImageElement, Omit<GlobalImageProps, "category">>((props, ref) => (
  <GlobalImage
    ref={ref}
    category="product"
    preload={true}
    showRetryButton={true}
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
    quality={70}
    {...props}
  />
));

ProductImage.displayName = "ProductImage";

// Hero image with optimized settings for LCP
export const HeroImage = forwardRef<HTMLImageElement, Omit<GlobalImageProps, "category">>((props, ref) => (
  <GlobalImage
    ref={ref}
    category="hero"
    preload={true}
    showLoadingSpinner={false}
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
    quality={75}
    {...props}
  />
));

HeroImage.displayName = "HeroImage";

// Blog image with optimized settings
export const BlogImage = forwardRef<HTMLImageElement, Omit<GlobalImageProps, "category">>((props, ref) => (
  <GlobalImage ref={ref} category="blog" preload={false} {...props} />
));

BlogImage.displayName = "BlogImage";

// Instagram image with optimized settings
export const InstagramImage = forwardRef<HTMLImageElement, Omit<GlobalImageProps, "category">>((props, ref) => (
  <GlobalImage
    ref={ref}
    category="instagram"
    preload={false}
    showLoadingSpinner={false}
    sizes="(max-width: 640px) 50vw, 400px"
    quality={65}
    {...props}
  />
));

InstagramImage.displayName = "InstagramImage";
