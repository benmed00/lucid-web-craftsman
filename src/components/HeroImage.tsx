// File_name: src/components/HeroImage.tsx

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Image } from "@/components/ui/image";
import heroImage from "@/assets/hero-image.jpg";

const HeroImage = () => {
  return (
    <div className="relative rounded-lg overflow-hidden">
      <AspectRatio
        ratio={4 / 5}
        className="md:aspect-w-4 md:aspect-h-5 bg-beige-100"
      >
        <Image
          src={heroImage}
          alt="Chapeau artisanal et sac traditionnel fait main"
          className="object-cover w-full h-full rounded-lg"
          fallbackText="Produits artisanaux"
        />
      </AspectRatio>
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 px-4 py-2 rounded-md">
        <p className="text-sm font-medium text-stone-700">
          En vedette: Chapeau Tressé et Sac Naturel
        </p>
      </div>
    </div>
  );
};

export default HeroImage;
