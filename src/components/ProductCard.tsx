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
    <Card key={product.id} className="bg-white border-none overflow-hidden group hover:shadow-lg transition-all duration-300 relative touch-manipulation">
      {/* Wishlist button - positioned absolutely */}
      <div className="absolute top-2 left-2 md:top-3 md:left-3 z-10">
        <WishlistButton 
          productId={product.id}
          size="sm"
          variant="ghost"
          className="bg-white/90 backdrop-blur-sm hover:bg-white p-2 md:p-1.5 rounded-full shadow-md"
        />
      </div>

      <Link to={`/products/${product.id}`} className="block touch-manipulation">
        <div className="relative group/image">
          <div className="aspect-square w-full overflow-hidden rounded-t-lg">
            <img
              src={product.images[0]}
              alt={product.name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
          
          {/* Quick View Button - always visible on mobile, hover on desktop */}
          {onQuickView && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onQuickView(product);
              }}
              className="absolute top-2 right-2 md:top-3 md:right-3 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg p-2 rounded-full touch-manipulation"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}

          {product.new && (
            <Badge className="absolute bottom-2 right-2 md:bottom-3 md:right-3 bg-olive-700 text-white border-none shadow-lg text-xs px-2 py-1">
              Nouveau
            </Badge>
          )}

          {/* Stock alerts */}
          {singleStockInfo && (
            <>
              {singleStockInfo.isOutOfStock && (
                <Badge className="absolute top-12 right-2 md:top-14 md:right-3 bg-red-600 text-white border-none shadow-lg text-xs px-2 py-1">
                  {singleStockInfo.message}
                </Badge>
              )}
              {singleStockInfo.isLow && !singleStockInfo.isOutOfStock && (
                <Badge className="absolute top-12 right-2 md:top-14 md:right-3 bg-amber-500 text-white border-none shadow-lg flex items-center gap-1 text-xs px-2 py-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="hidden sm:inline">{singleStockInfo.message}</span>
                  <span className="sm:hidden">Stock faible</span>
                </Badge>
              )}
            </>
          )}
        </div>
      </Link>
      
      <CardContent className="p-4 md:p-4">
        <p className="text-sm text-olive-700 font-medium mb-1">
          {product.category}
        </p>
        <Link to={`/products/${product.id}`} className="touch-manipulation">
          <h3 className="font-serif text-lg md:text-lg font-medium text-stone-800 mb-3 line-clamp-2 leading-tight">
            {product.name}
          </h3>
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-stone-700 font-medium text-lg">{product.price} €</p>
          <Button
            size="default"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(product);
            }}
            disabled={singleStockInfo?.isOutOfStock}
            className="w-full sm:w-auto bg-olive-700 hover:bg-olive-800 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 touch-manipulation min-h-[44px]"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span className="font-medium">
              {singleStockInfo?.isOutOfStock ? 'Indisponible' : 'Ajouter au panier'}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;