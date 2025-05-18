
import { AspectRatio } from "@/components/ui/aspect-ratio";

const HeroImage = () => {
  return (
    <div className="relative rounded-lg overflow-hidden">
      <AspectRatio ratio={4 / 5} className="md:aspect-w-4 md:aspect-h-5 bg-beige-100">
        <img
          src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80"
          alt="Model wearing handmade hat and holding woven bag"
          className="object-cover w-full h-full rounded-lg"
        />
      </AspectRatio>
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 px-4 py-2 rounded-md">
        <p className="text-sm font-medium text-stone-700">Featuring: Sunset Woven Hat & Natural Tote</p>
      </div>
    </div>
  );
};

export default HeroImage;
