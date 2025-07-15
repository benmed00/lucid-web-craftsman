import React from 'react';
import { Product } from '@/shared/interfaces/Iproduct.interface'; // Adjusted path
import ProductCard from './ProductCard'; // Assuming ProductCard is in the same directory

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, event: React.MouseEvent) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onAddToCart }) => {
  if (!products || products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-stone-600">Aucun produit trouvé</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
      {products.map((product) => (
        <ProductCard
          key={product.id} // Key is now correctly on the direct child of map
          product={product}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
