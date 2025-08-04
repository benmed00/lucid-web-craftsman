
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useHeroImage } from "@/hooks/useHeroImage";
import { useState } from "react";

const HeroImage = () => {
  const { heroImageData } = useHeroImage();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Fallback to available hero image
  const getImageSrc = (originalSrc: string) => {
    // List of available hero images in order of preference
    const fallbackImages = [
      originalSrc,
      "/assets/images/home_page_image.webp",
      "/assets/images/handmade_products.webp", 
      "/placeholder.svg"
    ];
    
    return imageError ? fallbackImages[1] : fallbackImages[0];
  };

  const handleImageError = () => {
    console.warn(`Hero image failed to load: ${heroImageData.imageUrl}`);
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  return (
    <div className="relative rounded-lg overflow-hidden shadow-lg">
      <AspectRatio
        ratio={4 / 5}
        className="bg-stone-100"
      >
        {/* Loading placeholder */}
        {imageLoading && (
          <div className="absolute inset-0 bg-stone-100 animate-pulse flex items-center justify-center">
            <div className="text-stone-400 text-sm">Chargement...</div>
          </div>
        )}
        
        {/* Main hero image */}
        <img
          src={getImageSrc(heroImageData.imageUrl)}
          alt={heroImageData.altText}
          className={`object-cover w-full h-full rounded-lg transition-all duration-700 hover:scale-105 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="eager"
        />
        
        {/* Error fallback with manual retry */}
        {imageError && (
          <div className="absolute inset-0 bg-gradient-to-br from-olive-100 to-stone-100 flex items-center justify-center">
            <div className="text-center p-6">
              <div className="text-stone-600 mb-2">Image en cours de chargement</div>
              <div className="text-xs text-stone-500">Produits artisanaux du Rif</div>
            </div>
          </div>
        )}
      </AspectRatio>
      
      {/* Gradient overlay - only show when image is loaded successfully */}
      {!imageError && !imageLoading && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-lg" />
      )}
      
      {/* Content overlay */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-white/95 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-stone-800 mb-1">
            {heroImageData.title}
          </p>
          <p className="text-xs text-stone-600">
            {heroImageData.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeroImage;
