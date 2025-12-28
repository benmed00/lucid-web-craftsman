import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: number;
  created_at: string;
}

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  loading: boolean;
  addToWishlist: (productId: number) => Promise<boolean>;
  removeFromWishlist: (productId: number) => Promise<boolean>;
  isInWishlist: (productId: number) => boolean;
  toggleWishlist: (productId: number) => Promise<boolean>;
  refetch: () => Promise<void>;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setWishlistItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWishlistItems(data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addToWishlist = useCallback(async (productId: number) => {
    if (!user) {
      toast.error('Vous devez être connecté pour ajouter aux favoris');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          product_id: productId
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistic update - add immediately to state
      if (data) {
        setWishlistItems(prev => [data, ...prev]);
      }
      
      toast.success('Produit ajouté aux favoris');
      return true;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('Erreur lors de l\'ajout aux favoris');
      return false;
    }
  }, [user]);

  const removeFromWishlist = useCallback(async (productId: number) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;

      // Optimistic update - remove immediately from state
      setWishlistItems(prev => prev.filter(item => item.product_id !== productId));
      
      toast.success('Produit retiré des favoris');
      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Erreur lors de la suppression des favoris');
      return false;
    }
  }, [user]);

  const isInWishlist = useCallback((productId: number) => {
    return wishlistItems.some(item => item.product_id === productId);
  }, [wishlistItems]);

  const toggleWishlist = useCallback(async (productId: number) => {
    if (isInWishlist(productId)) {
      return await removeFromWishlist(productId);
    } else {
      return await addToWishlist(productId);
    }
  }, [isInWishlist, removeFromWishlist, addToWishlist]);

  // Initial fetch when user changes
  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Real-time subscription for wishlist changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('wishlist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wishlist',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as WishlistItem;
            setWishlistItems(prev => {
              // Avoid duplicates
              if (prev.some(item => item.id === newItem.id)) return prev;
              return [newItem, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as WishlistItem).id;
            setWishlistItems(prev => prev.filter(item => item.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        loading,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        toggleWishlist,
        refetch: fetchWishlist,
        wishlistCount: wishlistItems.length
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlistContext = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlistContext must be used within a WishlistProvider');
  }
  return context;
};
