
// file_name : src/pages/ProductDetail.tsx

import { ArrowRight, Leaf, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addToCart, getProductById } from "@/api/mockApiService";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { Product } from "../shared/interfaces/Iproduct.interface";
import { toast } from "sonner";
import { useCart } from "../context/useCart";

const ProductDetail = () => {
  const { dispatch } = useCart();
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const handleAddToCart = async () => {
    if (!product || quantity < 1) return;

    try {
      // Add to cart via API (which updates localStorage)
      await addToCart(product, quantity);
      
      // Update global cart state
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

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchProductData = async () => {
      try {
        // Find the product with the matching id
        const productId = parseInt(id || "0");
        const foundProduct = await getProductById(productId);
        
        if (foundProduct) {
          setProduct(foundProduct);
          
          // Get related products
          if (foundProduct.related && foundProduct.related.length > 0) {
            const relatedProds = [];
            for (const relatedId of foundProduct.related) {
              const relatedProduct = await getProductById(relatedId);
              if (relatedProduct) {
                relatedProds.push(relatedProduct);
              }
            }
            setRelatedProducts(relatedProds);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching product:", error);
        setLoading(false);
      }
    };
    
    fetchProductData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex justify-center items-center">
          <div className="text-center">
            <p>Chargement du produit...</p>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-serif">Produit non trouvé</h2>
          <p className="mt-4 mb-8 text-stone-600">
            Le produit que vous recherchez n'existe pas.
          </p>
          <Link to="/products">
            <Button className="bg-olive-700 hover:bg-olive-800">
              Retour aux produits
            </Button>
          </Link>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Breadcrumbs */}
      <div className="container mx-auto px-4 py-4">
        <div className="text-sm text-stone-500">
          <Link to="/" className="hover:text-olive-700">
            Accueil
          </Link>
          <span className="mx-2">/</span>
          <Link to="/products" className="hover:text-olive-700">
            Boutique
          </Link>
          <span className="mx-2">/</span>
          <span className="text-stone-700">{product.name}</span>
        </div>
      </div>

      {/* Product Section */}
      <section className="container mx-auto px-4 py-8 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Product Images */}
          <div>
            <div className="aspect-ratio aspect-w-1 aspect-h-1 mb-4 overflow-hidden rounded-lg">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="object-cover w-full h-full"
              />
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image: string, idx: number) => (
                  <div
                    key={idx}
                    className={`aspect-ratio aspect-w-1 aspect-h-1 rounded-md overflow-hidden cursor-pointer border-2 
                      ${
                        selectedImage === idx
                          ? "border-olive-500"
                          : "border-transparent"
                      }`}
                    onClick={() => setSelectedImage(idx)}
                  >
                    <img
                      src={image}
                      alt={`${product.name} - vue ${idx + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-2">
              <Badge className="bg-olive-100 text-olive-800 hover:bg-olive-200 border-none">
                {product.category}
              </Badge>
              {product.new && (
                <Badge className="ml-2 bg-olive-500 text-white border-none">
                  Nouveau
                </Badge>
              )}
            </div>

            <h1 className="font-serif text-3xl md:text-4xl text-stone-800 mb-2">
              {product.name}
            </h1>

            <div className="text-2xl font-medium text-olive-700 mb-6">
              {product.price} €
            </div>

            <p className="text-stone-600 mb-8">{product.description}</p>

            {/* Artisan Information */}
            <div className="bg-beige-50 p-4 rounded-lg mb-8">
              <div className="flex items-center mb-2">
                <Leaf className="h-5 w-5 text-olive-600 mr-2" />
                <h3 className="font-medium">
                  Fait à la main par {product.artisan}
                </h3>
              </div>
              {product.artisanStory && (
                <p className="text-sm text-stone-600">{product.artisanStory}</p>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Quantité
              </label>
              <div className="flex">
                <button
                  className="border border-stone-300 rounded-l-md px-3 py-2 hover:bg-stone-50"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <input
                  type="text"
                  value={quantity}
                  readOnly
                  className="border-t border-b border-stone-300 px-4 py-2 w-16 text-center focus:outline-none"
                />
                <button
                  className="border border-stone-300 rounded-r-md px-3 py-2 hover:bg-stone-50"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              className="w-full mb-4 bg-olive-700 hover:bg-olive-800 text-white font-medium py-6"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              Ajouter au panier
            </Button>

            {/* Product Tabs */}
            <Tabs defaultValue="details" className="mt-8">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Détails</TabsTrigger>
                <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
                <TabsTrigger value="care">Entretien</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="mt-4">
                <div
                  className="text-stone-600 text-sm space-y-2"
                  dangerouslySetInnerHTML={{
                    __html: product.details.replace(
                      /<br>/g,
                      '<br class="block mb-2">'
                    ),
                  }}
                />
              </TabsContent>
              <TabsContent value="dimensions" className="mt-4">
                <div className="text-stone-600 text-sm">
                  Veuillez consulter les informations détaillées pour les
                  dimensions spécifiques de ce produit.
                </div>
              </TabsContent>
              <TabsContent value="care" className="mt-4">
                <div
                  className="text-stone-600 text-sm space-y-2"
                  dangerouslySetInnerHTML={{
                    __html: product.care.replace(
                      /<br>/g,
                      '<br class="block mb-2">'
                    ),
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="bg-beige-50 py-16">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-8">
              <h2 className="font-serif text-2xl md:text-3xl text-stone-800">
                Vous pourriez aussi aimer
              </h2>
              <Link
                to="/products"
                className="hidden md:flex items-center text-olive-700 hover:text-olive-900 transition-colors"
              >
                Voir tout <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {relatedProducts.map((product) => (
                <Link
                  to={`/products/${product.id}`}
                  key={product.id}
                  className="group"
                >
                  <Card className="border-none shadow-sm overflow-hidden hover-scale">
                    <div className="aspect-ratio aspect-w-1 aspect-h-1 relative overflow-hidden">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="text-xs text-stone-500 mb-1">
                        {product.category}
                      </div>
                      <h3 className="font-medium text-stone-800 mb-1">
                        {product.name}
                      </h3>
                      <p className="text-olive-700 font-medium">
                        {product.price} €
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <PageFooter />
    </div>
  );
};

export default ProductDetail;
