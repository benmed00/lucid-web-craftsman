import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  return (
    <Card key={product.id} className="bg-white border-none overflow-hidden group hover:shadow-md transition-all duration-300">
      <Link to={`/products/${product.id}`}>
        <div className="relative">
          <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg">
            <img
              src={product.images[0]}
              alt={product.name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          {product.new && (
            <Badge className="absolute top-2 right-2 bg-olive-700 text-white border-none">
              Nouveau
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
            onClick={() => onAddToCart(product)}
            className="bg-olive-700 hover:bg-olive-800"
          >
            <ShoppingCart className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
