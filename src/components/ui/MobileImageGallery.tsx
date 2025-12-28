import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileImageGalleryProps {
  images: string[];
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export const MobileImageGallery = ({
  images,
  productName,
  isOpen,
  onClose,
  initialIndex = 0
}: MobileImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const containerWidth = useRef(0);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Cache container width when gallery opens to prevent forced reflows
      if (containerRef.current) {
        containerWidth.current = containerRef.current.clientWidth;
      }
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
    setIsTransitioning(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    currentX.current = e.touches[0].clientX;
    const deltaX = currentX.current - startX.current;
    
    if (containerRef.current && containerWidth.current > 0) {
      // Use cached width to avoid forced reflow
      const translateX = -currentIndex * 100 + (deltaX / containerWidth.current) * 100;
      containerRef.current.style.transform = `translateX(${translateX}%)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    setIsTransitioning(true);
    
    const deltaX = currentX.current - startX.current;
    const threshold = 50; // Minimum swipe distance
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        setCurrentIndex(prev => prev - 1);
      } else if (deltaX < 0 && currentIndex < images.length - 1) {
        // Swipe left - go to next
        setCurrentIndex(prev => prev + 1);
      }
    }
    
    // Reset transform
    if (containerRef.current) {
      containerRef.current.style.transform = `translateX(-${currentIndex * 100}%)`;
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal bg-foreground">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-foreground/50 to-transparent p-4 safe-area">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-background hover:bg-background/10 p-2 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="text-background text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      </div>

      {/* Image Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          ref={containerRef}
          className={`flex w-full h-full ${isTransitioning ? 'transition-transform duration-300' : ''}`}
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {images.map((image, index) => (
            <div key={index} className="w-full h-full flex-shrink-0 flex items-center justify-center">
              <img
                src={image}
                alt={`${productName} - Image ${index + 1}`}
                className="max-w-full max-h-full object-contain touch-manipulation"
                style={{ userSelect: 'none' }}
              />
            </div>
          ))}
        </div>

        {/* Navigation Arrows - Hidden on small screens */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 p-3 rounded-full disabled:opacity-30 hidden sm:flex"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              disabled={currentIndex === images.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 p-3 rounded-full disabled:opacity-30 hidden sm:flex"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-2 safe-area">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 touch-manipulation ${
                index === currentIndex 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              style={{ minWidth: '32px', minHeight: '32px' }}
            />
          ))}
        </div>
      )}
    </div>
  );
};