import { Link } from "react-router-dom";
import { ShoppingCart, Eye, AlertTriangle } from "lucide-react";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WishlistButton } from "@/components/ui/WishlistButton";
import { useStock } from "@/hooks/useStock";
import { StockInfo } from "@/services/stockService";
import { useEffect } from "react";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onQuickView?: (product: Product) => void;
}

const ProductCard = ({ product, onAddToCart, onQuickView }: ProductCardProps) => {
  const { stockInfo } = useStock({ productId: product.id });

  // Type guard to ensure stockInfo is StockInfo for single product
  const singleStockInfo = stockInfo as StockInfo | null;
  return (
    <Card key={product.id} className="bg-white border-none overflow-hidden group hover:shadow-md transition-all duration-300 relative">
      {/* Wishlist button - positioned absolutely */}
      <div className="absolute top-3 left-3 z-10">
        <WishlistButton 
          productId={product.id}
          size="sm"
          variant="ghost"
          className="bg-white/80 backdrop-blur-sm hover:bg-white/90"
        />
      </div>

      <Link to={`/products/${product.id}`}>
        <div className="relative group/image">
          <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg">
            <img
              src={product.images[0]}
              alt={product.name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          
          {/* Quick View Button - appears on hover */}
          {onQuickView && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}

          {product.new && (
            <Badge className="absolute bottom-3 right-3 bg-olive-700 text-white border-none shadow-lg">
              Nouveau
            </Badge>
          )}

          {/* Stock alerts */}
          {singleStockInfo && (
            <>
              {singleStockInfo.isOutOfStock && (
                <Badge className="absolute top-3 right-3 bg-red-600 text-white border-none shadow-lg">
                  {singleStockInfo.message}
                </Badge>
              )}
              {singleStockInfo.isLow && !singleStockInfo.isOutOfStock && (
                <Badge className="absolute top-3 right-3 bg-amber-500 text-white border-none shadow-lg flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {singleStockInfo.message}
                </Badge>
              )}
            </>
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(product);
            }}
            disabled={singleStockInfo?.isOutOfStock}
            className="bg-olive-700 hover:bg-olive-800 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="mr-1 h-4 w-4" />
            {singleStockInfo?.isOutOfStock ? 'Indisponible' : 'Ajouter'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;