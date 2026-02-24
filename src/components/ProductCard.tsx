import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Eye, AlertTriangle, Share } from 'lucide-react';
import { Product, isProductNew } from '@/shared/interfaces/Iproduct.interface';
import { ProductImage } from '@/components/ui/GlobalImage';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WishlistButton } from '@/components/ui/WishlistButton';
import { NativeShare } from '@/components/ui/NativeShare';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { FallbackDot } from '@/components/ui/TranslationFallbackIndicator';
import { useStock } from '@/hooks/useStock';
import { StockInfo } from '@/services/stockService';
import { SupportedLocale } from '@/services/translationService';
import { useEffect, useState, useContext, createContext } from 'react';
import { useCurrency } from '@/stores';

// Create context for stock sharing - this will be provided by ProductShowcase
const StockContext = createContext<Record<number, StockInfo>>({});
const useStockContext = () => useContext(StockContext);

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  /** Whether the translation is a fallback */
  isFallback?: boolean;
  /** The locale being displayed if fallback */
  fallbackLocale?: SupportedLocale;
}

const ProductCard = ({
  product,
  onAddToCart,
  onQuickView,
  isFallback,
  fallbackLocale,
}: ProductCardProps) => {
  const { t } = useTranslation('products');

  // Try to get stock info from context first (for ProductShowcase)
  const stockContext = useStockContext();
  const contextStockInfo = stockContext[product.id];

  // Fallback to individual hook if not in context (for other components)
  const { stockInfo: individualStockInfo } = useStock({
    productId: product.id,
    enabled: !contextStockInfo,
  });

  // Use context stock info if available, otherwise use individual
  const stockInfo = contextStockInfo || individualStockInfo;

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
      className="bg-card border border-border overflow-hidden group hover:shadow-2xl transition-all duration-500 relative touch-manipulation rounded-xl sm:rounded-2xl hover:scale-[1.01] sm:hover:scale-[1.02] hover:-translate-y-1 shadow-md hover:shadow-xl hover:border-primary/30 w-full"
      role="article"
      aria-labelledby={`product-title-${product.id}`}
      aria-describedby={`product-price-${product.id} ${singleStockInfo?.isOutOfStock ? `product-stock-${product.id}` : ''}`}
    >
      <Link to={`/products/${product.id}`} className="block touch-manipulation">
        <div className="relative group/image">
          <div className="aspect-square sm:aspect-[4/5] w-full overflow-hidden rounded-t-xl">
            <ProductImage
              src={product.images[0]}
              alt={product.name}
              className="object-cover w-full h-full group-hover:scale-105 sm:group-hover:scale-110 transition-transform duration-700"
              aspectRatio="1/1"
            />
          </div>

          {/* Quick View Button - repositioned to top-right of image */}
          {onQuickView && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20">
              <TooltipWrapper
                content={t('details.quickView', { name: product.name })}
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
                  className="bg-background/95 backdrop-blur-sm hover:bg-background text-foreground p-2 sm:p-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 touch-manipulation min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px]"
                  aria-label={t('details.quickView', { name: product.name })}
                >
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </TooltipWrapper>
            </div>
          )}

          {/* Share Button - Mobile Only */}
          <div className="absolute top-12 right-2 sm:top-14 sm:right-3 z-10 md:hidden">
            <TooltipWrapper content={t('details.share')} side="left">
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
                className="bg-background/90 backdrop-blur-sm hover:bg-background text-foreground shadow-lg p-2 rounded-full touch-manipulation min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px]"
                aria-label={t('details.share')}
              >
                <Share className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </TooltipWrapper>
          </div>

          {isProductNew(product) && (
            <Badge className="absolute bottom-2 right-2 md:bottom-3 md:right-3 bg-primary text-primary-foreground border-none shadow-lg text-xs px-2 py-1">
              {t('details.new')}
            </Badge>
          )}

          {/* Stock alerts */}
          {singleStockInfo && (
            <>
              {singleStockInfo.isOutOfStock && (
                <Badge className="absolute top-12 right-2 md:top-14 md:right-3 bg-status-error text-status-error-foreground border-none shadow-lg text-xs px-2 py-1 font-semibold">
                  {t('details.outOfStock')}
                </Badge>
              )}
              {singleStockInfo.isLow && !singleStockInfo.isOutOfStock && (
                <Badge className="absolute top-2 left-2 md:top-3 md:left-3 bg-status-warning text-status-warning-foreground border-none shadow-lg flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="hidden sm:inline">
                    {t('details.lowStock', {
                      count:
                        singleStockInfo.available ||
                        singleStockInfo.maxQuantity ||
                        3,
                    })}
                  </span>
                  <span className="sm:hidden">
                    {t('details.lowStock', {
                      count:
                        singleStockInfo.available ||
                        singleStockInfo.maxQuantity ||
                        3,
                    })}
                  </span>
                </Badge>
              )}
            </>
          )}
        </div>
      </Link>

      <CardContent className="p-3 sm:p-4 md:p-5 relative">
        {/* Wishlist button - repositioned to top-right of white section */}
        <div
          className="absolute -top-2 right-2 sm:right-3 z-20"
          id={wishlistBtnId}
          data-name={`wishlist-${product.name.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <WishlistButton
            productId={product.id}
            size="sm"
            variant="ghost"
            className="bg-card border-2 border-border hover:bg-muted p-1.5 sm:p-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 touch-manipulation min-h-[32px] min-w-[32px] sm:min-h-[40px] sm:min-w-[40px]"
          />
        </div>

        <p className="text-[10px] sm:text-xs text-primary font-medium mb-1 sm:mb-2 uppercase tracking-wide">
          {product.category}
        </p>
        <Link to={`/products/${product.id}`} className="touch-manipulation">
          <h3
            id={`product-title-${product.id}`}
            className="font-serif text-sm sm:text-base md:text-lg font-medium text-foreground mb-2 sm:mb-3 line-clamp-2 leading-snug hover:text-primary transition-colors duration-200 pr-8 sm:pr-10 flex items-start gap-1"
          >
            <span>{product.name}</span>
            {isFallback && fallbackLocale && (
              <FallbackDot
                isFallback={isFallback}
                locale={fallbackLocale}
                className="mt-1 flex-shrink-0"
              />
            )}
          </h3>
        </Link>
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="relative">
            <p
              id={`product-price-${product.id}`}
              className="text-foreground font-bold text-base sm:text-lg md:text-xl whitespace-nowrap"
              aria-label={t('details.priceLabel', {
                price: formatPrice(product.price),
              })}
            >
              {formatPrice(product.price)}
            </p>
            {singleStockInfo?.isOutOfStock && (
              <span id={`product-stock-${product.id}`} className="sr-only">
                {t('details.outOfStock')}
              </span>
            )}
          </div>
          <TooltipWrapper
            content={
              singleStockInfo?.isOutOfStock
                ? t('details.outOfStock')
                : t('details.addToCartTooltip', {
                    name: product.name,
                    price: formatPrice(product.price),
                  })
            }
            side="top"
          >
            <Button
              id={addToCartBtnId}
              name={`add-to-cart-${product.name.toLowerCase().replace(/\s+/g, '-')}`}
              size="default"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart(product);
              }}
              disabled={singleStockInfo?.isOutOfStock}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed px-3 sm:px-4 py-2.5 sm:py-3 touch-manipulation min-h-[44px] sm:min-h-[48px] font-semibold text-xs sm:text-sm rounded-lg shadow-md hover:shadow-lg disabled:hover:bg-primary disabled:hover:shadow-md group relative overflow-hidden border-0"
              aria-label={
                singleStockInfo?.isOutOfStock
                  ? t('details.outOfStock')
                  : t('details.addToCartAria', {
                      name: product.name,
                      price: formatPrice(product.price),
                    })
              }
            >
              <div className="relative flex items-center justify-center gap-1.5 sm:gap-2 z-10">
                <ShoppingCart className="h-4 w-4" />
                <span className="font-medium">
                  {singleStockInfo?.isOutOfStock
                    ? t('details.outOfStock')
                    : t('details.addToCart')}
                </span>
              </div>

              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </TooltipWrapper>
        </div>
      </CardContent>

      {/* Native Share Dialog */}
      <NativeShare
        title={product.name}
        text={t('details.shareText', {
          name: product.name,
          description: product.description,
        })}
        url={`${window.location.origin}/products/${product.id}`}
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
      />
    </Card>
  );
};

export { StockContext, useStockContext };
export default ProductCard;
