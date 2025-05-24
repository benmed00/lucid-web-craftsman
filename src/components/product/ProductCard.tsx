import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';
import { Product } from '@/shared/interfaces/Iproduct.interface'; // Adjusted path

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, event: React.MouseEvent) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  return (
    <Link
      to={`/products/${product.id}`}
      key={product.id} // Key should ideally be on the list item in ProductGrid
      className="group relative"
    >
      <Card className="border-none shadow-sm overflow-hidden hover-scale">
        <div className="aspect-ratio aspect-w-1 aspect-h-1 relative overflow-hidden">
          <img
            src={product.images[0]}
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
          <div className="flex items-center justify-between mt-2">
            <p className="text-olive-700 font-medium">
              {product.price} €
            </p>
            <Button 
              size="sm" 
              className="bg-olive-700 hover:bg-olive-800"
              onClick={(e) => onAddToCart(product, e)}
            >
              <ShoppingBag className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProductCard;
