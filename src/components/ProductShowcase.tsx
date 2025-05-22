
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useCart } from "@/context/useCart";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { Product } from "@/shared/interfaces/Iproduct.interface";

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
  const { dispatch } = useCart();

  const handleAddToCart = (product: any) => {
    // Convert to full product format expected by cart
    const fullProduct: Product = {
      id: product.id,
      name: product.name,
      price: product.price,
      images: [product.image],
      category: product.category,
      description: `${product.name} - ${product.category}`,
      details: "", // Adding required fields from Product interface
      care: "",
      artisan: "Artisan local"
    };
    
    // Add to cart
    dispatch({
      type: "ADD_ITEM",
      payload: fullProduct,
      quantity: 1,
    });
    
    toast.success(`${product.name} ajouté au panier`);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <Card key={product.id} className="bg-white border-none overflow-hidden group hover:shadow-md transition-all duration-300">
          <Link to={`/products/${product.id}`}>
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
          </Link>
          <CardContent className="p-4">
            <p className="text-sm text-olive-700 font-medium">
              {product.category}
            </p>
            <Link to={`/products/${product.id}`}>
              <h3 className="font-serif text-lg font-medium text-stone-800 mt-1 mb-2">
                {product.name}
              </h3>
            </Link>
            <div className="flex justify-between items-center mt-2">
              <p className="text-stone-700 font-medium">{product.price} €</p>
              <Button 
                size="sm" 
                onClick={() => handleAddToCart(product)}
                className="bg-olive-700 hover:bg-olive-800"
              >
                <ShoppingCart className="mr-1 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProductShowcase;
