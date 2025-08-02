
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Image } from "@/components/ui/image";
import { useHeroImage } from "@/hooks/useHeroImage";

const HeroImage = () => {
  const { heroImageData } = useHeroImage();

  return (
    <div className="relative rounded-lg overflow-hidden shadow-lg">
      <AspectRatio
        ratio={4 / 5}
        className="md:aspect-w-4 md:aspect-h-5 bg-beige-100"
      >
        <Image
          src={heroImageData.imageUrl}
          alt={heroImageData.altText}
          className="object-cover w-full h-full rounded-lg transition-transform duration-700 hover:scale-105"
          fallbackText="Produits artisanaux du Rif"
        />
      </AspectRatio>
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-lg" />
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
