import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: number;
  created_at: string;
}

export const useWishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const { user } = useAuth();

  const fetchWishlist = async () => {
    if (!user) {
      setWishlistItems([]);
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous fetches
    if (isFetching) return;
    setIsFetching(true);

    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWishlistItems(data || []);
    } catch (error) {
      // Silent error handling for production
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const addToWishlist = async (productId: number) => {
    if (!user) {
      toast.error('Vous devez être connecté pour ajouter aux favoris');
      return false;
    }

    try {
      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          product_id: productId
        });

      if (error) throw error;

      await fetchWishlist();
      toast.success('Produit ajouté aux favoris');
      return true;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('Erreur lors de l\'ajout aux favoris');
      return false;
    }
  };

  const removeFromWishlist = async (productId: number) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      await fetchWishlist();
      toast.success('Produit retiré des favoris');
      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Erreur lors de la suppression des favoris');
      return false;
    }
  };

  const isInWishlist = (productId: number) => {
    return wishlistItems.some(item => item.product_id === productId);
  };

  const toggleWishlist = async (productId: number) => {
    if (isInWishlist(productId)) {
      return await removeFromWishlist(productId);
    } else {
      return await addToWishlist(productId);
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Debounce the fetch to prevent excessive calls
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchWishlist();
      }, 100);
    };

    debouncedFetch();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user?.id]); // Only depend on user.id, not the entire user object

  return {
    wishlistItems,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
    refetch: fetchWishlist,
    wishlistCount: wishlistItems.length
  };
};