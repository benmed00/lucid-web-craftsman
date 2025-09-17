import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Heart, Eye, Star, Minus, Plus, X } from 'lucide-react';
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
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && product) {
      setSelectedImageIndex(0);
      setQuantity(1);
      setIsWishlisted(false);
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
    toast.success(`${quantity}x ${product.name} ajouté au panier`);
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast.success(!isWishlisted ? 'Ajouté aux favoris' : 'Retiré des favoris');
  };

  const handleViewDetails = () => {
    navigate(`/products/${product.id}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[95vh] p-0 overflow-hidden bg-white border-0 shadow-2xl">
        <div className="relative h-full flex flex-col lg:flex-row">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg border border-gray-200"
          >
            <X className="h-5 w-5 text-gray-700" />
          </Button>

          {/* Image Section */}
          <div className="relative lg:w-1/2 h-[50vh] lg:h-full bg-gradient-to-br from-gray-50 to-gray-100">
            {/* New Badge */}
            {(product.new || product.is_new) && (
              <Badge className="absolute top-6 left-6 z-20 bg-emerald-600 text-white px-3 py-1 text-sm font-medium shadow-lg">
                Nouveau
              </Badge>
            )}

            {/* Main Image */}
            <div className="relative h-full overflow-hidden">
              <img
                src={images[selectedImageIndex]}
                alt={product.name}
                className="w-full h-full object-contain transition-all duration-500 hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = '/assets/images/handmade_products.webp';
                }}
              />
              
              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/20 backdrop-blur-sm rounded-full px-4 py-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          index === selectedImageIndex 
                            ? 'bg-white scale-125 shadow-lg' 
                            : 'bg-white/60 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Strip - Desktop Only */}
            {images.length > 1 && (
              <div className="hidden lg:flex absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t p-4 gap-3 overflow-x-auto">
                {images.slice(0, 6).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                      index === selectedImageIndex 
                        ? 'border-olive-600 shadow-lg scale-105' 
                        : 'border-gray-200 hover:border-gray-300 hover:scale-102'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = '/assets/images/handmade_products.webp'; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details Section */}
          <div className="flex-1 flex flex-col h-[50vh] lg:h-full overflow-y-auto">
            <div className="p-8 space-y-6">
              {/* Header */}
              <div className="space-y-4">
                <Badge variant="outline" className="w-fit text-olive-700 border-olive-300 bg-olive-50 px-3 py-1 text-sm font-medium">
                  {product.category}
                </Badge>
                
                <h2 className="text-3xl font-bold text-gray-900 leading-tight">
                  {product.name}
                </h2>
                
                {/* Rating */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 font-medium">(24 avis)</span>
                </div>

                <div className="text-4xl font-bold text-olive-700">{formatPrice(product.price)}</div>
              </div>

              {/* Description */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Description</h3>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>

              {/* Artisan Info */}
              {product.artisan && (
                <div className="bg-gradient-to-r from-olive-50 to-emerald-50 rounded-xl p-4 border border-olive-200">
                  <h4 className="font-semibold text-olive-800 mb-2">Artisan</h4>
                  <p className="text-olive-700 font-medium">{product.artisan}</p>
                </div>
              )}
            </div>

            {/* Actions Section - Sticky Bottom */}
            <div className="mt-auto bg-white border-t border-gray-100 p-8 space-y-6">
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
                    className="h-12 w-12 border-2 border-gray-300 hover:border-olive-600 hover:bg-olive-50"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-16 text-center font-bold text-xl text-gray-900">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-12 w-12 border-2 border-gray-300 hover:border-olive-600 hover:bg-olive-50"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <Button
                  onClick={handleAddToCart}
                  className="w-full bg-olive-700 hover:bg-olive-800 text-white py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <ShoppingCart className="mr-3 h-5 w-5" />
                  Ajouter au panier - {formatPrice(product.price * quantity)}
                </Button>

                <div className="grid grid-cols-2 gap-4">
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
                <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    Livraison gratuite
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    Retours 30 jours
                  </span>
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