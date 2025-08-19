import { Link } from "react-router-dom";
import { ShoppingCart, Eye, AlertTriangle, Share } from "lucide-react";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WishlistButton } from "@/components/ui/WishlistButton";
import { NativeShare } from "@/components/ui/NativeShare";
import { useStock } from "@/hooks/useStock";
import { StockInfo } from "@/services/stockService";
import { useEffect, useState } from "react";
import { useCurrency } from "@/context/CurrencyContext";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onQuickView?: (product: Product) => void;
}

const ProductCard = ({ product, onAddToCart, onQuickView }: ProductCardProps) => {
  const { stockInfo } = useStock({ productId: product.id });
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { formatPrice } = useCurrency();

  // Type guard to ensure stockInfo is StockInfo for single product
  const singleStockInfo = stockInfo as StockInfo | null;
  return (
    <Card key={product.id} className="bg-white border-none overflow-hidden group hover:shadow-xl transition-all duration-500 relative touch-manipulation rounded-xl hover:scale-[1.02] hover:-translate-y-1">
       {/* Wishlist button - positioned absolutely */}
      <div className="absolute top-3 left-3 z-20">
        <WishlistButton 
          productId={product.id}
          size="sm"
          variant="ghost"
          className="bg-white/95 backdrop-blur-sm hover:bg-white p-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
        />
      </div>

      <Link to={`/products/${product.id}`} className="block touch-manipulation">
        <div className="relative group/image">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-t-xl">
            <img
              src={product.images[0]}
              alt={product.name}
              className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
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

          {/* Share Button - Mobile Only */}
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowShareDialog(true);
            }}
            className="absolute top-12 right-2 md:top-14 md:right-3 md:hidden bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg p-2 rounded-full touch-manipulation"
          >
            <Share className="h-4 w-4" />
          </Button>

          {(product.new || product.is_new) && (
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
                <Badge className="absolute top-2 left-2 md:top-3 md:left-3 bg-amber-500 text-white border-none shadow-lg flex items-center gap-1 text-xs px-2 py-1 rounded-full">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="hidden sm:inline">{singleStockInfo.message}</span>
                  <span className="sm:hidden">Il ne reste que {singleStockInfo.maxQuantity || 3} pièces</span>
                </Badge>
              )}
            </>
          )}
        </div>
      </Link>
      
      <CardContent className="p-5 md:p-6">
        <p className="text-sm text-olive-700 font-medium mb-2 uppercase tracking-wide">
          {product.category}
        </p>
        <Link to={`/products/${product.id}`} className="touch-manipulation">
          <h3 className="font-serif text-lg md:text-xl font-medium text-stone-800 mb-4 line-clamp-2 leading-tight hover:text-olive-700 transition-colors duration-200">
            {product.name}
          </h3>
        </Link>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <p className="text-stone-800 font-bold text-xl md:text-2xl whitespace-nowrap">
              {formatPrice(product.price)}
            </p>
          </div>
          <Button
            size="default"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(product);
            }}
            disabled={singleStockInfo?.isOutOfStock}
            className="w-full bg-olive-700 hover:bg-olive-800 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 touch-manipulation min-h-[48px] font-medium text-base rounded-lg shadow-md hover:shadow-lg"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span>
              {singleStockInfo?.isOutOfStock ? 'Indisponible' : 'Ajouter au panier'}
            </span>
          </Button>
        </div>
      </CardContent>

      {/* Native Share Dialog */}
      <NativeShare
        title={product.name}
        text={`Découvrez ce magnifique ${product.name} - ${product.description}`}
        url={`${window.location.origin}/products/${product.id}`}
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
      />
    </Card>
  );
};

export default ProductCard;