import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Heart, Eye, Star, Minus, Plus, X, ZoomIn } from 'lucide-react';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { toast } from 'sonner';
import { MobileImageGallery } from '@/components/ui/MobileImageGallery';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCurrency } from '@/context/CurrencyContext';
import { useNavigate } from 'react-router-dom';

interface ProductQuickViewProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export const ProductQuickView = ({ product, isOpen, onClose, onAddToCart }: ProductQuickViewProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showMobileGallery, setShowMobileGallery] = useState(false);
  const isMobile = useIsMobile();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  // Reset state when product changes or popup opens
  useEffect(() => {
    if (isOpen && product) {
      setSelectedImageIndex(0);
      setQuantity(1);
      setIsWishlisted(false);
      setShowMobileGallery(false);
    }
  }, [isOpen, product?.id]);

  const normalizeImage = (u?: string) => {
    if (!u) return '/assets/images/handmade_products.webp';
    let s = u.trim();
    // Keep absolute URLs (Supabase, CDN, etc.) intact
    if (/^https?:\/\//i.test(s)) return s;
    // Remove wrong base prefix if present
    s = s.replace(/^\/lucid-web-craftsman/, '');
    if (!s.startsWith('/')) s = `/${s}`;
    return s;
  };

  const images = useMemo(() => {
    const arr = (product?.images ?? []).map(normalizeImage).filter(Boolean);
    return arr.length ? arr : ['/assets/images/handmade_products.webp'];
  }, [product]);

  if (!product) return null;
  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    toast.success(`${quantity}x ${product.name} ajouté au panier`);
  };

  const handleWishlist = () => {
    setIsWishlisted((prev) => !prev);
    toast.success(!isWishlisted ? 'Ajouté aux favoris' : 'Retiré des favoris');
  };
  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  const handleViewDetails = () => {
    navigate(`/products/${product.id}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden p-0 bg-white rounded-lg shadow-xl">
        <div className="h-full max-h-[90vh] overflow-y-auto">
        <DialogDescription className="sr-only">
          Aperçu rapide du produit {product.name} - {product.description}
        </DialogDescription>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
          {/* Images Section */}
          <div className="relative bg-gray-50 flex-shrink-0">
            <DialogHeader className="absolute top-2 right-2 z-20">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-md h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            {/* Main Image */}
              <div className="aspect-square lg:aspect-[4/3] bg-white relative overflow-hidden">
                <img
                  src={images[selectedImageIndex] || images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105 cursor-pointer"
                  onClick={() => isMobile && setShowMobileGallery(true)}
                  onError={(e) => {
                    if (selectedImageIndex !== 0 && images[0]) {
                      e.currentTarget.src = images[0];
                      setSelectedImageIndex(0);
                    } else {
                      e.currentTarget.src = '/assets/images/handmade_products.webp';
                    }
                  }}
                />
              {(product.new || product.is_new) && (
                <Badge className="absolute top-3 left-3 bg-olive-700 text-white shadow-sm">
                  Nouveau
                </Badge>
              )}
              
              {/* Mobile Zoom Button */}
              {isMobile && images.length > 0 && (
                <TooltipWrapper content="Agrandir les images">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowMobileGallery(true)}
                    className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm hover:bg-white shadow-md p-2 rounded-full h-8 w-8"
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </TooltipWrapper>
              )}
              
              {/* Image Navigation Dots */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === selectedImageIndex 
                          ? 'bg-white scale-125 shadow-sm' 
                          : 'bg-white/60 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail Images - Hide on mobile to save space */}
            {images.length > 1 && !isMobile && (
              <div className="flex gap-2 p-3 bg-gray-50 border-t">
                {images.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`w-14 h-14 rounded-md overflow-hidden border-2 transition-all flex-shrink-0 ${
                      index === selectedImageIndex 
                        ? 'border-olive-700 shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details Section */}
          <div className="p-4 lg:p-6 flex flex-col min-h-0 bg-white">
            <DialogHeader className="text-left space-y-2 mb-4">
              <Badge variant="outline" className="w-fit text-olive-700 border-olive-200 text-xs">
                {product.category}
              </Badge>
              
              <DialogTitle className="text-xl lg:text-2xl font-bold text-gray-900 leading-tight">
                {product.name}
              </DialogTitle>
              
              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 lg:h-4 lg:w-4 ${
                        i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs lg:text-sm text-gray-600">(24 avis)</span>
              </div>

              <div className="text-2xl lg:text-3xl font-bold text-olive-700">{formatPrice(product.price)}</div>
            </DialogHeader>

            <Separator className="my-3" />

            {/* Description */}
            <div className="mb-4 flex-1 min-h-0 overflow-y-auto">
              <p className="text-sm lg:text-base text-gray-600 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Artisan Info */}
            {product.artisan && (
              <div className="mb-4 p-3 bg-olive-50 rounded-lg">
                <h4 className="font-semibold text-olive-800 mb-1 text-sm">Artisan</h4>
                <p className="text-xs lg:text-sm text-olive-700">{product.artisan}</p>
              </div>
            )}

            <Separator className="my-3" />

            {/* Quantity Selector and Actions */}
            <div className="space-y-3 mt-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantité
                </label>
                <div className="flex items-center gap-3">
                  <TooltipWrapper content="Diminuer la quantité">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      className="h-8 w-8"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  </TooltipWrapper>
                  <span className="w-8 text-center font-medium text-sm">{quantity}</span>
                  <TooltipWrapper content="Augmenter la quantité">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={incrementQuantity}
                      className="h-8 w-8"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </TooltipWrapper>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <TooltipWrapper 
                  content={`Ajouter ${quantity}x ${product.name} au panier pour ${formatPrice(product.price * quantity)}`}
                >
                  <Button
                    onClick={handleAddToCart}
                    className="w-full bg-olive-700 hover:bg-olive-800 text-white py-2.5 text-sm"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Ajouter au panier - {formatPrice(product.price * quantity)}
                  </Button>
                </TooltipWrapper>

                <div className="grid grid-cols-2 gap-2">
                  <TooltipWrapper 
                    content={isWishlisted ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <Button
                      variant="outline"
                      onClick={handleWishlist}
                      className={`${
                        isWishlisted 
                          ? 'bg-red-50 text-red-600 border-red-200' 
                          : 'hover:bg-gray-50'
                      } text-xs lg:text-sm py-2`}
                    >
                      <Heart className={`mr-1.5 h-3 w-3 lg:h-4 lg:w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                      {isWishlisted ? 'Favoris' : 'Favoris'}
                    </Button>
                  </TooltipWrapper>

                  <TooltipWrapper content="Voir toutes les informations du produit">
                    <Button
                      variant="outline"
                      onClick={handleViewDetails}
                      className="text-xs lg:text-sm py-2"
                    >
                      <Eye className="mr-1.5 h-3 w-3 lg:h-4 lg:w-4" />
                      Détails
                    </Button>
                  </TooltipWrapper>
                </div>
              </div>

              {/* Product Features */}
              <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                <div className="flex items-center justify-center gap-4">
                  <span>✓ Livraison gratuite</span>
                  <span>✓ Retours 30 jours</span>
                </div>
               </div>
            </div>
          </div>
        </div>
        </div>
      </DialogContent>
      
      {/* Mobile Image Gallery */}
      <MobileImageGallery
        images={images}
        productName={product.name}
        isOpen={showMobileGallery}
        onClose={() => setShowMobileGallery(false)}
        initialIndex={selectedImageIndex}
      />
    </Dialog>
  );
};

// Also export as default to handle any caching issues
export default ProductQuickView;