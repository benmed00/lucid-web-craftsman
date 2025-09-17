import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Heart, Eye, Star, Minus, Plus, X, ZoomIn, Share2, Package, Truck, RotateCcw, Shield } from 'lucide-react';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { toast } from 'sonner';
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
  const [imageLoading, setImageLoading] = useState(true);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && product) {
      setSelectedImageIndex(0);
      setQuantity(1);
      setIsWishlisted(false);
      setImageLoading(true);
      setShowImageZoom(false);
    }
  }, [isOpen, product?.id]);

  const normalizeImage = (url?: string) => {
    if (!url) return '/assets/images/handmade_products.webp';
    let cleanUrl = url.trim();
    if (/^https?:\/\//i.test(cleanUrl)) return cleanUrl;
    cleanUrl = cleanUrl.replace(/^\/lucid-web-craftsman/, '');
    if (!cleanUrl.startsWith('/')) cleanUrl = `/${cleanUrl}`;
    return cleanUrl;
  };

  const images = useMemo(() => {
    const imageArray = (product?.images ?? []).map(normalizeImage).filter(Boolean);
    return imageArray.length ? imageArray : ['/assets/images/handmade_products.webp'];
  }, [product]);

  if (!product) return null;

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    toast.success(
      <div className="flex items-center gap-3">
        <ShoppingCart className="h-5 w-5 text-green-600" />
        <div>
          <div className="font-semibold">{quantity}x {product.name}</div>
          <div className="text-sm text-gray-600">Ajouté au panier</div>
        </div>
      </div>
    );
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast.success(!isWishlisted ? 'Ajouté aux favoris ❤️' : 'Retiré des favoris');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié dans le presse-papiers');
    }
  };

  const handleViewDetails = () => {
    navigate(`/products/${product.id}`);
    onClose();
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] sm:max-h-[85vh] p-0 bg-white border-0 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>{product.short_description || product.description}</DialogDescription>
        </DialogHeader>
        
        <div className="relative flex flex-col lg:flex-row h-full min-h-0">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-50 h-11 w-11 rounded-full bg-white/95 backdrop-blur-md hover:bg-white shadow-xl border border-gray-200/50 transition-all duration-300 hover:scale-110"
          >
            <X className="h-5 w-5 text-gray-700" />
          </Button>

          {/* Image Section */}
          <div className="relative lg:w-3/5 h-[40vh] sm:h-[45vh] lg:h-full bg-gradient-to-br from-gray-50 via-white to-gray-100 flex-shrink-0">
            {/* Badges */}
            <div className="absolute top-6 left-6 z-20 flex gap-2">
              {(product.new || product.is_new) && (
                <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-1.5 text-sm font-medium shadow-lg border-0 animate-pulse">
                  Nouveau
                </Badge>
              )}
              {product.stock_quantity && product.stock_quantity <= 3 && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1.5 text-sm font-medium shadow-lg border-0">
                  Stock limité
                </Badge>
              )}
            </div>

            {/* Share Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="absolute top-6 right-6 z-20 h-11 w-11 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg border border-gray-200/50 transition-all duration-300 hover:scale-110"
            >
              <Share2 className="h-4 w-4 text-gray-700" />
            </Button>

            {/* Main Image */}
            <div className="relative h-full overflow-hidden group">
              <div className="relative h-full flex items-center justify-center p-8">
                <img
                  src={images[selectedImageIndex]}
                  alt={product.name}
                  className={`max-w-full max-h-full object-contain transition-all duration-700 transform ${
                    imageLoading ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                  } ${showImageZoom ? 'scale-150 cursor-zoom-out' : 'hover:scale-105 cursor-zoom-in'}`}
                  onClick={() => setShowImageZoom(!showImageZoom)}
                  onLoad={() => setImageLoading(false)}
                  onError={(e) => {
                    e.currentTarget.src = '/assets/images/handmade_products.webp';
                    setImageLoading(false);
                  }}
                />
              </div>

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 h-12 w-12 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg border border-gray-200/50 opacity-0 group-hover:opacity-100 transition-all duration-300"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 h-12 w-12 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg border border-gray-200/50 opacity-0 group-hover:opacity-100 transition-all duration-300"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </>
              )}

              {/* Image Dots */}
              {images.length > 1 && (
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === selectedImageIndex 
                          ? 'bg-white scale-125 shadow-lg' 
                          : 'bg-white/60 hover:bg-white/90 hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Zoom Indicator */}
              <div className="absolute bottom-8 right-8 bg-black/30 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <ZoomIn className="h-4 w-4 text-white" />
              </div>
            </div>

            {/* Thumbnail Strip - Desktop Only */}
            {images.length > 1 && (
              <div className="hidden lg:flex absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t p-4 gap-3 overflow-x-auto">
                {images.slice(0, 6).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                      index === selectedImageIndex 
                        ? 'border-olive-600 shadow-lg scale-105 ring-2 ring-olive-200' 
                        : 'border-gray-200 hover:border-gray-300 hover:scale-102'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      onError={(e) => { e.currentTarget.src = '/assets/images/handmade_products.webp'; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details Section */}
          <div className="flex-1 flex flex-col lg:w-2/5 min-h-0 overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
              {/* Header */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-olive-700 border-olive-300 bg-olive-50 px-3 py-1.5 text-sm font-medium">
                    {product.category}
                  </Badge>
                  {product.artisan && (
                    <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium">
                      Fait main
                    </Badge>
                  )}
                </div>
                
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                  {product.name}
                </h2>
                
                {/* Rating */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 font-medium">(24 avis)</span>
                  <span className="text-sm text-emerald-600 font-medium">Très bien noté</span>
                </div>

                <div className="text-3xl lg:text-4xl font-bold text-olive-700">{formatPrice(product.price)}</div>
              </div>

              <Separator />

              {/* Description */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Description</h3>
                <p className="text-gray-700 leading-relaxed text-sm lg:text-base">{product.description}</p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Package className="h-5 w-5 text-olive-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Fait main</div>
                    <div className="text-xs text-gray-600">Artisanat authentique</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Shield className="h-5 w-5 text-olive-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Qualité premium</div>
                    <div className="text-xs text-gray-600">Matériaux nobles</div>
                  </div>
                </div>
              </div>

              {/* Artisan Info */}
              {product.artisan && (
                <div className="bg-gradient-to-r from-olive-50 to-emerald-50 rounded-xl p-4 border border-olive-200">
                  <h4 className="font-semibold text-olive-800 mb-2 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                    Artisan: {product.artisan}
                  </h4>
                  <p className="text-olive-700 text-sm">
                    {product.artisan_story || "Créé avec passion et savoir-faire traditionnel"}
                  </p>
                </div>
              )}
            </div>

            {/* Actions Section - Sticky Bottom */}
            <div className="mt-auto bg-white border-t border-gray-100 p-6 lg:p-8 space-y-6">
              {/* Quantity Selector */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-900">
                  Quantité
                </label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="h-12 w-12 border-2 border-gray-300 hover:border-olive-600 hover:bg-olive-50 transition-all duration-300"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-16 text-center font-bold text-xl text-gray-900">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-12 w-12 border-2 border-gray-300 hover:border-olive-600 hover:bg-olive-50 transition-all duration-300"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <Button
                  onClick={handleAddToCart}
                  className="w-full bg-gradient-to-r from-olive-700 to-olive-800 hover:from-olive-800 hover:to-olive-900 text-white py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  <ShoppingCart className="mr-3 h-5 w-5" />
                  Ajouter au panier - {formatPrice(product.price * quantity)}
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={handleWishlist}
                    className={`py-3 border-2 transition-all duration-300 ${
                      isWishlisted 
                        ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100' 
                        : 'border-gray-300 hover:border-olive-600 hover:bg-olive-50'
                    }`}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                    Favoris
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleViewDetails}
                    className="py-3 border-2 border-gray-300 hover:border-olive-600 hover:bg-olive-50 transition-all duration-300"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Détails
                  </Button>
                </div>
              </div>

              {/* Features */}
              <div className="pt-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-emerald-500" />
                    Livraison gratuite
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-emerald-500" />
                    Retours 30 jours
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductQuickView;