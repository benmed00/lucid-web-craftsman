import { Card, CardContent } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { useEffect } from "react";

// Product data - in a real application, this would come from an API
const products = [
  {
    id: 1,
    name: "Sac à Main Tissé Traditionnel",
    price: 89,
    image: "public/assets/images/products/sac_a_main_tisse_traditionnel.jpg",
    category: "Sacs",
    new: true,
  },
  {
    id: 2,
    name: "Chapeau de Paille Berbère",
    price: 45,
    image: "public/assets/images/products/chapeau_de_paille_berbere.jpg",
    category: "Chapeaux",
  },
  {
    id: 3,
    name: "Pochette Brodée à la Main",
    price: 62,
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?ixlib=rb-4.0.3&auto=format&fit=crop&w=640&q=80",
    category: "Sacs",
  },
  {
    id: 4,
    name: "Cabas en Fibres Naturelles",
    price: 75,
    image:
      "https://images.unsplash.com/photo-1578237493287-8d4d2b03591a?ixlib=rb-4.0.3&auto=format&fit=crop&w=640&q=80",
    category: "Sacs",
  },
  {
    id: 5,
    name: "Chapeau de Soleil Tressé",
    price: 52,
    image:
      "https://images.unsplash.com/photo-1572307480813-ceb0e59d8325?ixlib=rb-4.0.3&auto=format&fit=crop&w=640&q=80",
    category: "Chapeaux",
    new: true,
  },
  {
    id: 6,
    name: "Panier de Marché Traditionnel",
    price: 68,
    image:
      "https://images.unsplash.com/photo-1532086853747-99450c17fa2e?ixlib=rb-4.0.3&auto=format&fit=crop&w=640&q=80",
    category: "Sacs",
  },
];

const Products = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Banner */}
      <div className="bg-beige-50 py-12 mb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-2 bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">
              Collection Artisanale
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl text-stone-800 mb-4">
              Notre Boutique
            </h1>
            <p className="text-stone-600 md:text-lg">
              Découvrez notre sélection de sacs et chapeaux faits main dans les
              montagnes du Rif au Maroc, perpétuant des traditions ancestrales.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="border-olive-300 bg-olive-50 text-olive-800 hover:bg-olive-100 cursor-pointer"
            >
              Tous les produits
            </Badge>
            <Badge
              variant="outline"
              className="border-stone-300 hover:border-olive-300 hover:bg-olive-50 hover:text-olive-800 cursor-pointer"
            >
              Sacs
            </Badge>
            <Badge
              variant="outline"
              className="border-stone-300 hover:border-olive-300 hover:bg-olive-50 hover:text-olive-800 cursor-pointer"
            >
              Chapeaux
            </Badge>
          </div>

          <div className="flex gap-2">
            <select className="text-sm border border-stone-300 rounded-md py-2 px-3 focus:outline-none focus:border-olive-400">
              <option>Trier par: Populaire</option>
              <option>Prix: Croissant</option>
              <option>Prix: Décroissant</option>
              <option>Nouveautés</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <Link
              to={`/products/${product.id}`}
              key={product.id}
              className="group"
            >
              <Card className="border-none shadow-sm overflow-hidden hover-scale">
                <div className="aspect-ratio aspect-w-1 aspect-h-1 relative overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                  />
                  {product.new && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-olive-500 text-white border-none">
                        Nouveau
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="text-xs text-stone-500 mb-1">
                    {product.category}
                  </div>
                  <h3 className="font-medium text-stone-800 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-olive-700 font-medium">
                    {product.price} €
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <PageFooter />
    </div>
  );
};

export default Products;
