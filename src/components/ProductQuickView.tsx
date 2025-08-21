import { useState, useEffect } from 'react';
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

  if (!product) return null;

  const handleAddToCart = () => {
    onAddToCart(product, quantity);
    toast.success(`${quantity}x ${product.name} ajouté au panier`);
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? 'Retiré des favoris' : 'Ajouté aux favoris');
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  const handleViewDetails = () => {
    navigate(`/products/${product.id}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogDescription className="sr-only">
          Aperçu rapide du produit {product.name} - {product.description}
        </DialogDescription>
        <div className="grid md:grid-cols-2 gap-0">
          {/* Images Section */}
          <div className="relative">
            <DialogHeader className="absolute top-4 right-4 z-10">
              <Button
                variant="secondary"
                size="icon"
                onClick={onClose}
                className="rounded-full bg-white/80 backdrop-blur-sm hover:bg-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            {/* Main Image */}
            <div className="aspect-square bg-gray-100 relative overflow-hidden">
              <img
                src={product.images?.[selectedImageIndex] || product.images?.[0] || '/placeholder.svg'}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105 cursor-pointer"
                onClick={() => isMobile && setShowMobileGallery(true)}
                onError={(e) => {
                  // Fallback to first image if selected image fails
                  if (selectedImageIndex !== 0 && product.images?.[0]) {
                    e.currentTarget.src = product.images[0];
                    setSelectedImageIndex(0);
                  }
                }}
              />
              {(product.new || product.is_new) && (
                <Badge className="absolute top-4 left-4 bg-olive-700 text-white">
                  Nouveau
                </Badge>
              )}
              
              {/* Mobile Zoom Button */}
              {isMobile && product.images.length > 0 && (
                <TooltipWrapper content="Agrandir les images">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowMobileGallery(true)}
                    className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm hover:bg-white shadow-lg p-2 rounded-full"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipWrapper>
              )}
              
              {/* Image Navigation Dots */}
              {product.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {product.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === selectedImageIndex 
                          ? 'bg-white scale-125' 
                          : 'bg-white/60 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {product.images.length > 1 && (
              <div className="flex gap-2 p-4 bg-gray-50">
                {product.images.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === selectedImageIndex 
                        ? 'border-olive-700' 
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
          <div className="p-6 flex flex-col">
            <DialogHeader className="text-left space-y-3 mb-4">
              <Badge variant="outline" className="w-fit text-olive-700 border-olive-200">
                {product.category}
              </Badge>
              
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {product.name}
              </DialogTitle>
              
              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">(24 avis)</span>
              </div>

              <div className="text-3xl font-bold text-olive-700 whitespace-nowrap">
                {formatPrice(product.price)}
              </div>
            </DialogHeader>

            <Separator className="my-4" />

            {/* Description */}
            <div className="mb-6">
              <p className="text-gray-600 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Artisan Info */}
            {product.artisan && (
              <div className="mb-6 p-4 bg-olive-50 rounded-lg">
                <h4 className="font-semibold text-olive-800 mb-2">Artisan</h4>
                <p className="text-sm text-olive-700">{product.artisan}</p>
              </div>
            )}

            <Separator className="my-4" />

            {/* Quantity Selector */}
            <div className="mb-6">
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
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </TooltipWrapper>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <TooltipWrapper content="Augmenter la quantité">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={incrementQuantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipWrapper>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mt-auto">
              <TooltipWrapper 
                content={`Ajouter ${quantity}x ${product.name} au panier pour ${formatPrice(product.price * quantity)}`}
              >
                <Button
                  onClick={handleAddToCart}
                  className="w-full bg-olive-700 hover:bg-olive-800 text-white py-3"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Ajouter au panier - {formatPrice(product.price * quantity)}
                </Button>
              </TooltipWrapper>

              <div className="grid grid-cols-2 gap-3">
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
                    }`}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                    {isWishlisted ? 'Favoris' : 'Ajouter'}
                  </Button>
                </TooltipWrapper>
                
                <TooltipWrapper content="Voir la page détaillée du produit">
                  <Button 
                    variant="outline" 
                    onClick={handleViewDetails}
                    id={`view-details-${product.id}`}
                    name={`view-details-${product.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Voir détails
                  </Button>
                </TooltipWrapper>
              </div>
            </div>

            {/* Product Features */}
            <div className="mt-6 text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>✓ Livraison gratuite</span>
                <span>✓ Retours 30 jours</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      
      {/* Mobile Image Gallery */}
      <MobileImageGallery
        images={product.images}
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