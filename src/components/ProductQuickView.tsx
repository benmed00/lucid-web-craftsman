import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Heart, Eye, Star, Minus, Plus, X, ZoomIn, Share2, Package, Truck, RotateCcw, Shield } from 'lucide-react';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { toast } from 'sonner';
import { useCurrency } from '@/context/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
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

  const content = (
    <>
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
          className="absolute top-4 right-4 z-modal h-11 w-11 rounded-full bg-background/95 backdrop-blur-md hover:bg-background shadow-xl border border-border/50 transition-all duration-300 hover:scale-110"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Image Section */}
        <div className="relative lg:w-3/5 h-[40vh] sm:h-[45vh] lg:h-full bg-gradient-to-br from-muted/50 via-background to-muted flex-shrink-0">
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
            className="absolute top-6 right-6 z-20 h-11 w-11 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-lg border border-border/50 transition-all duration-300 hover:scale-110"
          >
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Main Image */}
          <div className="relative h-full overflow-hidden group">
            <div className="relative h-full flex items-center justify-center p-8">
              <img
                src={images[selectedImageIndex]}
                alt={product.name}
                className={`max-w-full max-h-full object-contain transition-all duration-700 transform ${
                  showImageZoom ? 'scale-105' : 'scale-100'
                } ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setImageLoading(false)}
                onError={(e) => { e.currentTarget.src = '/assets/images/handmade_products.webp'; setImageLoading(false); }}
              />

              {/* Gradient overlays for better contrast */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-black/5" />
            </div>

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/90 hover:bg-background shadow border border-border flex items-center justify-center"
                  aria-label="Image précédente"
                >
                  <span className="sr-only">Précédente</span>
                  ‹
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/90 hover:bg-background shadow border border-border flex items-center justify-center"
                  aria-label="Image suivante"
                >
                  <span className="sr-only">Suivante</span>
                  ›
                </button>
              </>
            )}

            {/* Thumbnails - Desktop */}
            {images.length > 1 && (
              <div className="hidden lg:flex absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 gap-3 overflow-x-auto">
                {images.slice(0, 6).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                      index === selectedImageIndex 
                        ? 'border-primary shadow-lg scale-105 ring-2 ring-primary/20' 
                        : 'border-border hover:border-muted-foreground hover:scale-102'
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

            {/* Zoom Indicator */}
            <div className="absolute bottom-8 right-8 bg-foreground/30 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <ZoomIn className="h-4 w-4 text-background" />
            </div>
          </div>
        </div>

        {/* Product Details Section */}
        <div className="flex-1 flex flex-col lg:w-2/5 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium">
                  {product.category}
                </Badge>
                {product.artisan && (
                  <Badge variant="outline" className="text-accent border-accent/30 bg-accent/5 px-3 py-1.5 text-sm font-medium">
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
              <h3 className="text-lg font-semibold text-foreground">Description</h3>
              <p className="text-muted-foreground leading-relaxed text-sm lg:text-base">{product.description}</p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-medium text-foreground">Fait main</div>
                  <div className="text-xs text-muted-foreground">Artisanat authentique</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-medium text-foreground">Qualité premium</div>
                  <div className="text-xs text-muted-foreground">Matériaux nobles</div>
                </div>
              </div>
            </div>

            {/* Artisan Info */}
            {product.artisan && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                <div className="text-sm">
                  <div className="font-medium text-emerald-800">Artisan: {product.artisan}</div>
                  <div className="text-emerald-700/80">Créé avec passion et savoir-faire traditionnel</div>
                </div>
              </div>
            )}

            {/* Quantity and Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">Quantité</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Diminuer la quantité">
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="w-10 text-center font-medium">{quantity}</div>
                  <Button variant="outline" size="icon" onClick={() => setQuantity((q) => q + 1)} aria-label="Augmenter la quantité">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button className="bg-olive-700 hover:bg-olive-800" onClick={handleAddToCart}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Ajouter au panier
                </Button>
                <Button variant="outline" onClick={handleWishlist}>
                  <Heart className={`mr-2 h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                  {isWishlisted ? 'Dans la wishlist' : 'Ajouter à la wishlist'}
                </Button>
                <Button variant="ghost" onClick={handleViewDetails} className="col-span-1 sm:col-span-2">
                  <Eye className="mr-2 h-4 w-4" />
                  Voir les détails complets
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
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="bottom" className="h-[92vh] p-0 bg-white overflow-hidden rounded-t-xl [&>button]:hidden">
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] sm:max-h-[85vh] p-0 bg-white border-0 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300 overflow-hidden [&>button]:hidden">
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default ProductQuickView;