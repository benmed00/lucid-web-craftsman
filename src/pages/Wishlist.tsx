import { useState, useEffect } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Navigation from '@/components/Navigation';
import PageFooter from '@/components/PageFooter';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import { products } from '@/data/products';
import { formatPrice } from '@/lib/stripe';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

const Wishlist = () => {
  const { wishlistItems, loading, removeFromWishlist } = useWishlist();
  const { user } = useAuth();
  const { dispatch } = useCart();
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);

  useEffect(() => {
    // Get product details for wishlist items
    const productDetails = wishlistItems.map(item => {
      const product = products.find(p => p.id === item.product_id);
      return product ? { ...product, wishlistId: item.id } : null;
    }).filter(Boolean);
    
    setWishlistProducts(productDetails);
  }, [wishlistItems]);

  const handleRemoveFromWishlist = async (productId: number) => {
    await removeFromWishlist(productId);
  };

  const handleAddToCart = (product: any) => {
    dispatch({
      type: "ADD_ITEM",
      payload: product,
      quantity: 1
    });
    toast.success("Produit ajouté au panier");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <Heart className="w-16 h-16 text-stone-300 mx-auto mb-6" />
            <h1 className="font-serif text-3xl md:text-4xl text-stone-800 mb-4">
              Mes Favoris
            </h1>
            <p className="text-stone-600 mb-8">
              Vous devez être connecté pour voir vos favoris.
            </p>
            <Button asChild className="bg-olive-700 hover:bg-olive-800">
              <Link to="/auth">Se connecter</Link>
            </Button>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Heart className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <h1 className="font-serif text-3xl md:text-4xl text-stone-800">
                  Mes Favoris
                </h1>
                <p className="text-stone-600 mt-1">
                  {wishlistItems.length} produit{wishlistItems.length > 1 ? 's' : ''} sauvegardé{wishlistItems.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-stone-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-6 bg-stone-200 rounded w-3/4"></div>
                        <div className="h-4 bg-stone-200 rounded w-1/2"></div>
                        <div className="h-4 bg-stone-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : wishlistProducts.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-16 h-16 text-stone-300 mx-auto mb-6" />
              <h2 className="font-serif text-2xl text-stone-800 mb-4">
                Votre liste de favoris est vide
              </h2>
              <p className="text-stone-600 mb-8">
                Découvrez nos créations artisanales et ajoutez vos préférées à vos favoris.
              </p>
              <Button asChild className="bg-olive-700 hover:bg-olive-800">
                <Link to="/products">Découvrir nos produits</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {wishlistProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      {/* Product Image */}
                      <Link 
                        to={`/products/${product.id}`}
                        className="flex-shrink-0"
                      >
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-24 h-24 object-cover rounded-lg hover:scale-105 transition-transform duration-200"
                        />
                      </Link>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <Link 
                              to={`/products/${product.id}`}
                              className="hover:text-olive-700 transition-colors"
                            >
                              <h3 className="font-medium text-lg text-stone-800 mb-2">
                                {product.name}
                              </h3>
                            </Link>
                            
                            <div className="flex items-center gap-4 text-sm text-stone-600 mb-4">
                              <span className="bg-stone-100 px-2 py-1 rounded text-xs">
                                {product.category}
                              </span>
                              <span>Par {product.artisan}</span>
                            </div>

                            <p className="text-stone-600 text-sm line-clamp-2 mb-4">
                              {product.description}
                            </p>

                            <div className="text-2xl font-semibold text-olive-700 mb-4">
                              {formatPrice(product.price)}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddToCart(product)}
                              className="hover:bg-olive-50 hover:border-olive-200"
                            >
                              Ajouter au panier
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFromWishlist(product.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Separator className="my-8" />
              
              <div className="text-center">
                <p className="text-stone-600 mb-4">
                  Continuez votre shopping pour découvrir d'autres créations
                </p>
                <Button asChild variant="outline">
                  <Link to="/products">
                    Voir tous nos produits
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <PageFooter />
    </div>
  );
};

export default Wishlist;