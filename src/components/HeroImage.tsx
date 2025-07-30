
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Image } from "@/components/ui/image";

const HeroImage = () => {
  return (
    <div className="relative rounded-lg overflow-hidden shadow-lg">
      <AspectRatio
        ratio={4 / 5}
        className="md:aspect-w-4 md:aspect-h-5 bg-beige-100"
      >
        <Image
          src="/lovable-uploads/8937573b-31a4-4669-8ea2-8e6c35b45b81.png"
          alt="Chapeau artisanal et sac traditionnel fait main - Artisanat authentique du Rif"
          className="object-cover w-full h-full rounded-lg transition-transform duration-700 hover:scale-105"
          fallbackText="Produits artisanaux du Rif"
        />
      </AspectRatio>
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-lg" />
      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-white/95 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-stone-800 mb-1">
            Artisanat Authentique du Rif
          </p>
          <p className="text-xs text-stone-600">
            Chapeau tressé et sac naturel - Fait main avec amour
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeroImage;
