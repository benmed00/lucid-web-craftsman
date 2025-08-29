import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  ShoppingBag, 
  Star, 
  Plus, 
  Minus,
  Truck,
  Shield,
  RotateCcw,
  Leaf,
  CheckCircle,
  AlertTriangle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Camera,
  Download,
  Copy,
  Facebook,
  Twitter,
  MessageCircle
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

// Custom Components
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import SEOHelmet from "@/components/seo/SEOHelmet";
import { ProductImage } from "@/components/ui/GlobalImage";
import ProductReviews from "@/components/ProductReviews";
import { ProductRecommendations } from "@/components/ProductRecommendations";
import { WishlistButton } from "@/components/ui/WishlistButton";
import { RecentlyViewedProducts } from "@/components/RecentlyViewedProducts";

// Services & Hooks
import { ProductService } from "@/services/productService";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";
import { useStock } from "@/hooks/useStock";
import { useShipping } from "@/hooks/useShipping";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";

// Types & Interfaces
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { StockInfo } from "@/services/stockService";

// Utils
import { sanitizeHtmlContent } from "@/utils/xssProtection";

interface ProductDetailProps {}

const ProductDetail: React.FC<ProductDetailProps> = () => {
  // Router & Navigation
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Auth & Cart
  const { user } = useAuth();
  const { dispatch } = useCart();
  const { formatPrice } = useCurrency();
  
  // Product State
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  
  // Refs
  const imageGalleryRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  
  // Hooks
  const { addToRecentlyViewed } = useRecentlyViewed();
  const { isInWishlist, toggleWishlist } = useWishlist();
  
  // Stock and shipping hooks
  const { stockInfo, canOrderQuantity } = useStock({ 
    productId: product?.id || 0, 
    enabled: !!product 
  });
  const singleStockInfo = stockInfo as StockInfo | null;
  
  const { getShippingMessage, isNantesMetropole } = useShipping({
    orderAmount: product ? product.price * quantity : 0,
    postalCode: '44000', // Default to Nantes for demo
    enabled: !!product
  });

  // Effects
  useEffect(() => {
    const fetchProductData = async () => {
      if (!id) {
        setError("ID produit manquant");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Load all products for recommendations
        const products = await ProductService.getAllProducts();
        setAllProducts(products);

        // Find the product with the matching id
        const productId = parseInt(id);
        if (isNaN(productId)) {
          throw new Error("ID produit invalide");
        }

        const foundProduct = await ProductService.getProductById(productId);

        if (!foundProduct) {
          throw new Error("Produit non trouvé");
        }

        setProduct(foundProduct);
        
        // Add to recently viewed
        addToRecentlyViewed(foundProduct);

        // Get related products based on category and artisan
        const categoryProducts = products.filter(p => 
          p.id !== foundProduct.id && 
          (p.category === foundProduct.category || p.artisan === foundProduct.artisan)
        );
        setRelatedProducts(categoryProducts.slice(0, 6));

        // Scroll to top
        window.scrollTo(0, 0);

      } catch (error) {
        console.error("Error fetching product:", error);
        setError(error instanceof Error ? error.message : "Erreur lors du chargement du produit");
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [id, addToRecentlyViewed]);

  // Handlers
  const handleAddToCart = async () => {
    if (!product || quantity < 1) return;

    // Validate stock before adding to cart
    const canOrder = await canOrderQuantity(product.id, quantity);
    if (!canOrder.canOrder) {
      toast.error(canOrder.reason || "Impossible d'ajouter ce produit au panier");
      return;
    }

    try {
      // Update global cart state directly
      dispatch({
        type: "ADD_ITEM",
        payload: product,
        quantity,
      });

      // Show success message
      toast.success(`${quantity} × ${product.name} ajouté au panier`);
    } catch (error) {
      console.error("Error adding product to cart:", error);
      toast.error("Impossible d'ajouter le produit au panier");
    }
  };

  const handleWishlistToggle = async () => {
    if (!product) return;
    await toggleWishlist(product.id);
  };

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const title = `${product?.name} - Artisanat Berbère`;
    const text = `Découvrez cette magnifique création artisanale : ${product?.name}`;

    try {
      switch (platform) {
        case 'native':
          if (navigator.share) {
            await navigator.share({ title, text, url });
          } else {
            await navigator.clipboard.writeText(url);
            toast.success("Lien copié dans le presse-papiers");
          }
          break;
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
          break;
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank');
          break;
        case 'copy':
          await navigator.clipboard.writeText(url);
          toast.success("Lien copié dans le presse-papiers");
          break;
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error("Erreur lors du partage");
    }
    setShareMenuOpen(false);
  };

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    const maxQuantity = singleStockInfo?.maxQuantity || 99;
    
    if (newQuantity >= 1 && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
    }
  };

  const handleImageChange = (direction: 'next' | 'prev') => {
    if (!product) return;
    
    const totalImages = product.images.length;
    if (direction === 'next') {
      setSelectedImage((prev) => (prev + 1) % totalImages);
    } else {
      setSelectedImage((prev) => (prev - 1 + totalImages) % totalImages);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-4 w-64" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Image Gallery Skeleton */}
            <div className="space-y-4">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
              </div>
            </div>
            
            {/* Product Info Skeleton */}
            <div className="space-y-6">
              <div>
                <Skeleton className="h-6 w-24 mb-4" />
                <Skeleton className="h-10 w-3/4 mb-4" />
                <Skeleton className="h-8 w-32 mb-6" />
              </div>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  // Error State
  if (error || !product) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-serif text-stone-800 mb-4">
              {error || "Produit non trouvé"}
            </h2>
            <p className="text-stone-600 mb-8">
              Le produit que vous recherchez n'existe pas ou n'est plus disponible.
            </p>
            <div className="space-x-4">
              <Button 
                variant="outline" 
                onClick={() => navigate(-1)}
                className="border-stone-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button 
                asChild
                className="bg-olive-700 hover:bg-olive-800"
              >
                <Link to="/products">
                  Voir tous les produits
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  const productRating = product.rating_average || 0;
  const reviewCount = product.rating_count || 0;

  return (
    <>
      <SEOHelmet 
        title={`${product.name} - ${product.category} fait main par ${product.artisan}`}
        description={product.short_description || product.description}
        image={product.images[0]}
      />

      <div className="min-h-screen bg-white">
        <Navigation />

        <main className="container mx-auto px-4 py-8">
          {/* Breadcrumbs */}
          <nav className="mb-8" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-stone-500">
              <li>
                <Link to="/" className="hover:text-olive-700 transition-colors">
                  Accueil
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link to="/products" className="hover:text-olive-700 transition-colors">
                  Boutique
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link to={`/products?category=${product.category}`} className="hover:text-olive-700 transition-colors">
                  {product.category}
                </Link>
              </li>
              <li>/</li>
              <li className="text-stone-700 font-medium" aria-current="page">
                {product.name}
              </li>
            </ol>
          </nav>

          {/* Main Product Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative group">
                <div className="aspect-square overflow-hidden rounded-xl bg-stone-100">
                  <ProductImage
                    src={product.images[selectedImage]}
                    alt={`${product.name} - vue ${selectedImage + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    preload={true}
                  />
                  
                  {/* Image Navigation */}
                  {product.images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleImageChange('prev')}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleImageChange('next')}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {/* Zoom Button */}
                  <Dialog open={showImageZoom} onOpenChange={setShowImageZoom}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-4 right-4 bg-white/80 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <ProductImage
                        src={product.images[selectedImage]}
                        alt={`${product.name} - vue agrandie`}
                        className="w-full h-auto"
                      />
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Image Indicators */}
                {product.images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                    {product.images.map((_, index) => (
                      <button
                        key={index}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === selectedImage ? 'bg-white' : 'bg-white/50'
                        }`}
                        onClick={() => setSelectedImage(index)}
                        aria-label={`Voir l'image ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-3" ref={thumbnailsRef}>
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                        selectedImage === index
                          ? 'border-olive-500 ring-2 ring-olive-200'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                      onClick={() => setSelectedImage(index)}
                    >
                      <ProductImage
                        src={image}
                        alt={`${product.name} - miniature ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Information */}
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="outline" className="text-olive-700 border-olive-200">
                    {product.category}
                  </Badge>
                  {(product.new || product.is_new) && (
                    <Badge className="bg-olive-600 text-white">
                      Nouveau
                    </Badge>
                  )}
                  {product.is_featured && (
                    <Badge className="bg-amber-500 text-white">
                      ⭐ Coup de cœur
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl lg:text-4xl font-serif text-stone-800 mb-4">
                  {product.name}
                </h1>

                {/* Rating */}
                {reviewCount > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(productRating)
                              ? 'text-amber-400 fill-current'
                              : 'text-stone-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-stone-600">
                      {productRating.toFixed(1)} ({reviewCount} avis)
                    </span>
                  </div>
                )}

                {/* Price */}
                <div className="mb-6">
                  <div className="text-3xl font-bold text-olive-700">
                    {formatPrice(product.price)}
                  </div>
                  <p className="text-sm text-stone-600 mt-1">
                    TVA incluse • Livraison calculée à l'étape suivante
                  </p>
                </div>
              </div>

              {/* Short Description */}
              <div>
                <p className="text-stone-600 leading-relaxed">
                  {product.short_description || product.description}
                </p>
                {product.description.length > 200 && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-olive-700 hover:text-olive-800 text-sm mt-2 font-medium"
                  >
                    {showFullDescription ? 'Voir moins' : 'Voir plus'}
                  </button>
                )}
                {showFullDescription && (
                  <div className="mt-4 text-stone-600 leading-relaxed">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtmlContent(product.description),
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Stock Status */}
              {singleStockInfo && (
                <Alert className={`${
                  singleStockInfo.isOutOfStock 
                    ? 'border-red-200 bg-red-50' 
                    : singleStockInfo.isLow 
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-green-200 bg-green-50'
                }`}>
                  <div className="flex items-center gap-2">
                    {singleStockInfo.isOutOfStock ? (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    ) : singleStockInfo.isLow ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    <AlertDescription className={`font-medium ${
                      singleStockInfo.isOutOfStock 
                        ? 'text-red-800' 
                        : singleStockInfo.isLow 
                        ? 'text-amber-800'
                        : 'text-green-800'
                    }`}>
                      {singleStockInfo.message}
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              {/* Quantity Selector */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-3">
                  Quantité {singleStockInfo && `(maximum: ${singleStockInfo.maxQuantity})`}
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-stone-300 rounded-lg">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      className="h-10 w-10 p-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="px-4 py-2 min-w-[3rem] text-center font-medium">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuantityChange(1)}
                      disabled={singleStockInfo ? quantity >= singleStockInfo.maxQuantity : false}
                      className="h-10 w-10 p-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={singleStockInfo?.isOutOfStock || !singleStockInfo?.canOrder}
                  className="w-full h-12 bg-olive-700 hover:bg-olive-800 text-white font-medium disabled:opacity-50"
                  size="lg"
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  {singleStockInfo?.isOutOfStock ? 'Produit indisponible' : 'Ajouter au panier'}
                </Button>

                <div className="flex gap-3">
                  <WishlistButton
                    productId={product.id}
                    className="flex-1 h-12"
                    variant="outline"
                  />
                  
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-12 px-4"
                      onClick={() => setShareMenuOpen(!shareMenuOpen)}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                    
                    {shareMenuOpen && (
                      <Card className="absolute top-full right-0 mt-2 z-10 p-3">
                        <CardContent className="p-0">
                          <div className="grid grid-cols-2 gap-2 min-w-[200px]">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShare('native')}
                              className="justify-start"
                            >
                              <Share2 className="h-4 w-4 mr-2" />
                              Partager
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShare('copy')}
                              className="justify-start"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copier
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShare('facebook')}
                              className="justify-start"
                            >
                              <Facebook className="h-4 w-4 mr-2" />
                              Facebook
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShare('whatsapp')}
                              className="justify-start"
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              WhatsApp
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 py-6 border-t border-stone-200">
                <div className="text-center">
                  <Truck className="h-6 w-6 text-olive-600 mx-auto mb-2" />
                  <p className="text-xs text-stone-600 font-medium">Livraison rapide</p>
                  <p className="text-xs text-stone-500">2-5 jours</p>
                </div>
                <div className="text-center">
                  <Shield className="h-6 w-6 text-olive-600 mx-auto mb-2" />
                  <p className="text-xs text-stone-600 font-medium">Paiement sécurisé</p>
                  <p className="text-xs text-stone-500">SSL & 3D Secure</p>
                </div>
                <div className="text-center">
                  <RotateCcw className="h-6 w-6 text-olive-600 mx-auto mb-2" />
                  <p className="text-xs text-stone-600 font-medium">Retours gratuits</p>
                  <p className="text-xs text-stone-500">14 jours</p>
                </div>
              </div>

              {/* Artisan Info */}
              <Card className="bg-beige-50 border-beige-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <Leaf className="h-6 w-6 text-olive-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-stone-800 mb-2">
                        Fait à la main par {product.artisan}
                      </h3>
                      {(product.artisan_story || product.artisanStory) && (
                        <p className="text-sm text-stone-600 leading-relaxed">
                          {product.artisan_story || product.artisanStory}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Info */}
              <Alert className="border-blue-200 bg-blue-50">
                <Truck className="h-5 w-5 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div>
                    <p className="font-medium mb-1">Informations de livraison</p>
                    <p className="text-sm">
                      {getShippingMessage() || '🚚 Livraison: 2-5 jours • France métropolitaine'}
                    </p>
                    {isNantesMetropole('44000') && (
                      <p className="text-sm mt-1 font-medium">
                        ✨ Livraison gratuite sur la métropole Nantaise !
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Product Details Tabs */}
          <div className="mb-16">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-8">
                <TabsTrigger value="details">Détails</TabsTrigger>
                <TabsTrigger value="specs">Caractéristiques</TabsTrigger>
                <TabsTrigger value="care">Entretien</TabsTrigger>
                <TabsTrigger value="shipping">Livraison</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-medium text-stone-800 mb-4">Description détaillée</h3>
                    <div
                      className="prose prose-stone max-w-none text-stone-600"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtmlContent(product.details),
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="specs" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-medium text-stone-800 mb-4">Caractéristiques techniques</h3>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {product.material && (
                        <>
                          <dt className="font-medium text-stone-700">Matériau</dt>
                          <dd className="text-stone-600">{product.material}</dd>
                        </>
                      )}
                      {product.color && (
                        <>
                          <dt className="font-medium text-stone-700">Couleur</dt>
                          <dd className="text-stone-600">{product.color}</dd>
                        </>
                      )}
                      {product.dimensions_cm && (
                        <>
                          <dt className="font-medium text-stone-700">Dimensions</dt>
                          <dd className="text-stone-600">{product.dimensions_cm}</dd>
                        </>
                      )}
                      {product.weight_grams && (
                        <>
                          <dt className="font-medium text-stone-700">Poids</dt>
                          <dd className="text-stone-600">{product.weight_grams}g</dd>
                        </>
                      )}
                      <dt className="font-medium text-stone-700">Artisan</dt>
                      <dd className="text-stone-600">{product.artisan}</dd>
                      <dt className="font-medium text-stone-700">Catégorie</dt>
                      <dd className="text-stone-600">{product.category}</dd>
                    </dl>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="care" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-medium text-stone-800 mb-4">Instructions d'entretien</h3>
                    <div
                      className="prose prose-stone max-w-none text-stone-600"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtmlContent(product.care),
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="shipping" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-medium text-stone-800 mb-4">Livraison et retours</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-stone-700 mb-2">Délais de livraison</h4>
                        <p className="text-stone-600">2-5 jours ouvrés en France métropolitaine</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-stone-700 mb-2">Frais de livraison</h4>
                        <p className="text-stone-600">
                          Gratuite à partir de 50€ d'achat. Sinon 4,90€ en France métropolitaine.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-stone-700 mb-2">Retours</h4>
                        <p className="text-stone-600">
                          Retours gratuits sous 14 jours. L'article doit être dans son état d'origine.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Reviews Section */}
          <div className="mb-16">
            <ProductReviews 
              productId={product.id} 
              productName={product.name}
            />
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mb-16">
              <ProductRecommendations
                allProducts={relatedProducts}
                title="Vous pourriez aussi aimer"
                maxRecommendations={6}
                onQuickView={() => {}}
              />
            </div>
          )}

          {/* Recently Viewed */}
          <div className="mb-16">
            <RecentlyViewedProducts />
          </div>
        </main>

        <PageFooter />
      </div>
    </>
  );
};

export default ProductDetail;