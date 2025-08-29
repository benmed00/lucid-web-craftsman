import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
  lazy?: boolean;
  webp?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fallback?: string;
  sizes?: string;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 85,
  priority = false,
  lazy = true,
  webp = true,
  placeholder = 'empty',
  blurDataURL,
  fallback = '/assets/images/handmade_products.webp',
  sizes,
  aspectRatio,
  objectFit = 'cover',
  className,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  // Generate WebP source if enabled
  const generateWebPSrc = (originalSrc: string): string => {
    if (!webp || originalSrc.includes('.webp')) return originalSrc;
    
    // For Supabase storage URLs, we can add format parameters
    if (originalSrc.includes('supabase')) {
      const url = new URL(originalSrc);
      url.searchParams.set('format', 'webp');
      if (quality) url.searchParams.set('quality', quality.toString());
      if (width) url.searchParams.set('width', width.toString());
      if (height) url.searchParams.set('height', height.toString());
      return url.toString();
    }
    
    // For other sources, try to replace extension
    return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  };

  // Generate optimized src with dimensions and quality
  const generateOptimizedSrc = (originalSrc: string): string => {
    // Handle relative URLs by converting to absolute
    if (originalSrc.startsWith('/assets/')) {
      return `${window.location.origin}${originalSrc}`;
    }
    
    if (originalSrc.includes('supabase')) {
      const url = new URL(originalSrc);
      if (quality && quality !== 85) url.searchParams.set('quality', quality.toString());
      if (width) url.searchParams.set('width', width.toString());
      if (height) url.searchParams.set('height', height.toString());
      return url.toString();
    }
    return originalSrc;
  };

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px 0px',
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [lazy, priority, isInView]);

  // Handle image source selection
  useEffect(() => {
    if (!isInView) return;

    const loadImage = async () => {
      try {
        // Try WebP first if enabled
        if (webp) {
          const webpSrc = generateWebPSrc(src);
          if (webpSrc !== src) {
            try {
              await checkImageExists(webpSrc);
              setCurrentSrc(webpSrc);
              return;
            } catch {
              // WebP failed, fall back to original
            }
          }
        }

        // Use optimized version of original format
        const optimizedSrc = generateOptimizedSrc(src);
        await checkImageExists(optimizedSrc);
        setCurrentSrc(optimizedSrc);
      } catch {
        // Original failed, use fallback
        setHasError(true);
        setCurrentSrc(fallback);
      }
    };

    loadImage();
  }, [isInView, src, webp, quality, width, height, fallback]);

  // Check if image exists and is loadable
  const checkImageExists = (imgSrc: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = imgSrc;
    });
  };

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setCurrentSrc(fallback);
    } else {
      onError?.();
    }
  };

  // Generate responsive sizes if not provided
  const responsiveSizes = sizes || 
    (width ? `(max-width: 768px) ${Math.min(width, 400)}px, ${width}px` : 
     '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw');

  const containerStyle: React.CSSProperties = {
    aspectRatio: aspectRatio || (width && height ? `${width}/${height}` : undefined),
    position: 'relative',
  };

  const imgStyle: React.CSSProperties = {
    objectFit,
    width: '100%',
    height: '100%',
    transition: 'opacity 0.3s ease',
    opacity: isLoaded ? 1 : 0,
  };

  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease',
    backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: blurDataURL ? 'blur(10px)' : undefined,
  };

  return (
    <div style={containerStyle} className={cn('overflow-hidden', className)}>
      {/* Placeholder */}
      {placeholder !== 'empty' && (
        <div style={placeholderStyle}>
          {!blurDataURL && (
            <div className="animate-pulse bg-stone-200 w-full h-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-stone-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Actual Image */}
      {isInView && currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={responsiveSizes}
          style={imgStyle}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
};

export default OptimizedImage;