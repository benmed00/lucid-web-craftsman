
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useHeroImage } from "@/hooks/useHeroImage";
import { HeroImage as HeroImageComponent } from "@/components/ui/GlobalImage";

const HeroImage = () => {
  const { heroImageData, isLoading } = useHeroImage();

  if (isLoading) {
    return (
      <div className="relative rounded-lg overflow-hidden shadow-lg">
        <AspectRatio ratio={4 / 5} className="bg-stone-100">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
          </div>
        </AspectRatio>
      </div>
    );
  }

  return (
    <div className="group relative rounded-lg overflow-hidden shadow-lg">
      <AspectRatio
        ratio={4 / 5}
        className="bg-stone-100"
      >
        {/* Main hero image with advanced loading and fallback */}
        <HeroImageComponent
          src={heroImageData.imageUrl}
          alt={heroImageData.altText}
          className="object-cover w-full h-full rounded-lg"
          fallbackText="Produits artisanaux du Rif"
          preload={true}
          showLoadingSpinner={true}
          showRetryButton={false}
        />
      </AspectRatio>
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-lg" />
      
      {/* Hover hint text */}
      <div className="absolute top-6 left-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out">
        <div className="bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
          <p className="text-sm font-medium">{heroImageData.altText}</p>
        </div>
      </div>
      
      {/* Content overlay - fades on hover */}
      <div className="absolute bottom-6 left-6 right-6 group-hover:opacity-0 transition-opacity duration-700 ease-in-out">
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
