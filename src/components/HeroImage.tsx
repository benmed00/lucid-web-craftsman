
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useHeroImage } from "@/hooks/useHeroImage";
import { HeroImage as HeroImageComponent } from "@/components/ui/GlobalImage";

const HeroImage = () => {
  const { heroImageData, isLoading } = useHeroImage();

  // Render default image immediately while loading data
  if (isLoading) {
    return (
      <div className="group relative rounded-lg overflow-hidden shadow-lg">
        <AspectRatio
          ratio={4 / 5}
          className="bg-muted"
        >
          {/* Show default image immediately to optimize LCP */}
          <HeroImageComponent
            src="/assets/images/home_page_image.webp"
            alt="Chapeau artisanal et sac traditionnel fait main - Artisanat authentique du Rif"
            className="object-cover w-full h-full rounded-lg"
            fallbackText="Produits artisanaux du Rif"
            preload={true}
            showLoadingSpinner={false}
            showRetryButton={false}
          />
        </AspectRatio>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-lg" />
        
        {/* Default content overlay */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-card/95 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg border border-border/50">
            <p className="text-sm font-medium text-foreground mb-1">
              Artisanat Authentique du Rif
            </p>
            <p className="text-xs text-muted-foreground">
              Chapeau tressé et sac naturel - Fait main avec amour
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative rounded-lg overflow-hidden shadow-lg">
      <AspectRatio
        ratio={4 / 5}
        className="bg-muted"
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
        <div className="bg-card/95 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg border border-border/50">
          <p className="text-sm font-medium text-foreground mb-1">
            {heroImageData.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {heroImageData.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeroImage;
