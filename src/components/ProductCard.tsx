import { Link } from "react-router-dom";
import { ShoppingCart, Eye, AlertTriangle, Share } from "lucide-react";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import OptimizedImage from "@/components/performance/OptimizedImage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WishlistButton } from "@/components/ui/WishlistButton";
import { NativeShare } from "@/components/ui/NativeShare";
import { TooltipWrapper } from "@/components/ui/TooltipWrapper";
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
  
  // Generate unique IDs for accessibility
  const cardId = `product-card-${product.id}`;
  const quickViewBtnId = `quick-view-btn-${product.id}`;
  const addToCartBtnId = `add-to-cart-btn-${product.id}`;
  const wishlistBtnId = `wishlist-btn-${product.id}`;
  const shareBtnId = `share-btn-${product.id}`;

  return (
    <Card 
      id={cardId}
      className="bg-white border border-stone-100 overflow-hidden group hover:shadow-2xl transition-all duration-500 relative touch-manipulation rounded-2xl hover:scale-[1.02] hover:-translate-y-1 shadow-lg hover:border-olive-200"
    >
      <Link to={`/products/${product.id}`} className="block touch-manipulation">
        <div className="relative group/image">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-t-xl">
            <OptimizedImage
              src={product.images[0]}
              alt={product.name}
              width={400}
              height={300}
              aspectRatio="4/3"
              className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
              priority={false}
              webp={true}
              quality={85}
            />
          </div>
          
          {/* Quick View Button - repositioned to top-right of image */}
          {onQuickView && (
            <div className="absolute top-3 right-3 z-20">
              <TooltipWrapper 
                content={`Aperçu rapide de ${product.name}`}
                side="left"
              >
                <Button
                  id={quickViewBtnId}
                  name={`quick-view-${product.name.toLowerCase().replace(/\s+/g, '-')}`}
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onQuickView(product);
                  }}
                  className="bg-white/95 backdrop-blur-sm hover:bg-white p-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
                  aria-label={`Aperçu rapide de ${product.name}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipWrapper>
            </div>
          )}

          {/* Share Button - Mobile Only */}
          <div className="absolute top-16 right-3 z-10 md:hidden">
            <TooltipWrapper 
              content={`Partager ${product.name}`}
              side="left"
            >
              <Button
                id={shareBtnId}
                name={`share-${product.name.toLowerCase().replace(/\s+/g, '-')}`}
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowShareDialog(true);
                }}
                className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg p-2 rounded-full touch-manipulation"
                aria-label={`Partager ${product.name}`}
              >
                <Share className="h-4 w-4" />
              </Button>
            </TooltipWrapper>
          </div>

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
      
      <CardContent className="p-5 md:p-6 relative">
        {/* Wishlist button - repositioned to top-right of white section */}
        <div 
          className="absolute -top-2 right-4 z-20"
          id={wishlistBtnId}
          data-name={`wishlist-${product.name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <WishlistButton 
            productId={product.id}
            size="sm"
            variant="ghost"
            className="bg-white border-2 border-stone-200 hover:bg-stone-50 p-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
          />
        </div>

        <p className="text-sm text-olive-700 font-medium mb-2 uppercase tracking-wide">
          {product.category}
        </p>
        <Link to={`/products/${product.id}`} className="touch-manipulation">
          <h3 className="font-serif text-lg md:text-xl font-medium text-stone-800 mb-4 line-clamp-2 leading-tight hover:text-olive-700 transition-colors duration-200 pr-12">
            {product.name}
          </h3>
        </Link>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <p className="text-stone-800 font-bold text-xl md:text-2xl whitespace-nowrap">
              {formatPrice(product.price)}
            </p>
          </div>
          <TooltipWrapper 
            content={singleStockInfo?.isOutOfStock 
              ? `${product.name} est actuellement indisponible` 
              : `Ajouter ${product.name} à votre panier (${formatPrice(product.price)})`
            }
            side="top"
          >
            <Button
              id={addToCartBtnId}
              name={`add-to-cart-${product.name.toLowerCase().replace(/\s+/g, '-')}`}
              size="lg"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart(product);
              }}
              disabled={singleStockInfo?.isOutOfStock}
              className="w-full bg-olive-700 hover:bg-olive-800 text-white hover:text-white active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-4 touch-manipulation min-h-[52px] font-semibold text-base rounded-xl shadow-lg hover:shadow-xl disabled:hover:bg-olive-700 disabled:hover:shadow-lg group relative overflow-hidden border-0"
              aria-label={singleStockInfo?.isOutOfStock 
                ? `${product.name} est indisponible` 
                : `Ajouter ${product.name} au panier pour ${formatPrice(product.price)}`
              }
            >
              <div className="relative flex items-center justify-center gap-2 z-10">
                <ShoppingCart className="h-5 w-5" />
                <span className="font-medium">
                  {singleStockInfo?.isOutOfStock ? 'Indisponible' : 'Ajouter au panier'}
                </span>
              </div>
              
              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-olive-600 to-olive-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </TooltipWrapper>
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