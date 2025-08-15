import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Heart, Eye, Star, Minus, Plus, X } from 'lucide-react';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { toast } from 'sonner';

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
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
                src={product.images[selectedImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
              {product.new && (
                <Badge className="absolute top-4 left-4 bg-olive-700 text-white">
                  Nouveau
                </Badge>
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

              <div className="text-3xl font-bold text-olive-700">
                {product.price}€
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
                <Button
                  variant="outline"
                  size="icon"
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={incrementQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mt-auto">
              <Button
                onClick={handleAddToCart}
                className="w-full bg-olive-700 hover:bg-olive-800 text-white py-3"
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Ajouter au panier - {(product.price * quantity).toFixed(2)}€
              </Button>

              <div className="grid grid-cols-2 gap-3">
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
                
                <Button variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  Voir détails
                </Button>
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
    </Dialog>
  );
};

// Also export as default to handle any caching issues
export default ProductQuickView;