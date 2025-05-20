import { Card, CardContent } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const products = [
  {
    id: 1,
    name: "Sac Tressé Naturel",
    price: 89,
    image:
      "lucid-web-craftsman/assets/images/produits_phares/sac_tresse_naturel.jpeg",
    category: "Sacs",
    badge: "Bestseller",
  },
  {
    id: 2,
    name: "Chapeau à Large Bord",
    price: 65,
    image:
      "lucid-web-craftsman/assets/images/produits_phares/chapeau_a_large_bord.webp",
    category: "Chapeaux",
    badge: "Nouveau",
  },
  {
    id: 3,
    name: "Sac Bandoulière",
    price: 110,
    image:
      "lucid-web-craftsman/assets/images/produits_phares/sac_bandouliere.webp",
    category: "Sacs",
  },
  {
    id: 4,
    name: "Chapeau Panama",
    price: 75,
    image:
      "lucid-web-craftsman/assets/images/produits_phares/chapeau_panama.webp",
    category: "Chapeaux",
  },
];

const ProductShowcase = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <Link to={`/products/${product.id}`} key={product.id}>
          <Card className="bg-white border-none overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="relative">
              <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg">
                <img
                  src={product.image}
                  alt={product.name}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              {product.badge && (
                <Badge className="absolute top-2 right-2 bg-olive-700 text-white border-none">
                  {product.badge}
                </Badge>
              )}
            </div>
            <CardContent className="p-4">
              <p className="text-sm text-olive-700 font-medium">
                {product.category}
              </p>
              <h3 className="font-serif text-lg font-medium text-stone-800 mt-1 mb-2">
                {product.name}
              </h3>
              <p className="text-stone-700 font-medium">{product.price} €</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default ProductShowcase;
