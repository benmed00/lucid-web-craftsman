import React from 'react';
import { Product } from '@/shared/interfaces/Iproduct.interface'; // Adjusted path
import { Badge } from '@/components/ui/badge';
import { Leaf } from 'lucide-react';

interface ProductInfoProps {
  product: Product;
}

const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  if (!product) return null;

  return (
    <div>
      <div className="mb-2">
        <Badge className="bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">
          {product.category}
        </Badge>
        {product.new && (
          <Badge className="ml-2 bg-olive-500 text-white border-none">
            Nouveau
          </Badge>
        )}
      </div>

      <h1 className="font-serif text-3xl md:text-4xl text-stone-800 mb-2">
        {product.name}
      </h1>

      <div className="text-2xl font-medium text-olive-700 mb-6">
        {product.price} €
      </div>

      <p className="text-stone-600 mb-8">{product.description}</p>

      {/* Artisan Information */}
      {product.artisan && ( // Check if artisan info exists
        <div className="bg-beige-50 p-4 rounded-lg mb-8">
          <div className="flex items-center mb-2">
            <Leaf className="h-5 w-5 text-olive-600 mr-2" />
            <h3 className="font-medium">
              Fait à la main par {product.artisan}
            </h3>
          </div>
          {product.artisanStory && (
            <p className="text-sm text-stone-600">{product.artisanStory}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductInfo;
