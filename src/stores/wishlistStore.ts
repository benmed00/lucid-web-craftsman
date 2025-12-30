// src/stores/wishlistStore.ts
// Zustand store for wishlist management with Supabase sync

import { create } from 'zustand';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============= Types =============
export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: number;
  created_at: string;
}

interface WishlistState {
  // State
  items: WishlistItem[];
  loading: boolean;
  userId: string | null;
  _realtimeChannel: ReturnType<typeof supabase.channel> | null;
  
  // Actions
  setUserId: (userId: string | null) => void;
  fetchWishlist: () => Promise<void>;
  addToWishlist: (productId: number) => Promise<boolean>;
  removeFromWishlist: (productId: number) => Promise<boolean>;
  toggleWishlist: (productId: number) => Promise<boolean>;
  clearWishlist: () => void;
  
  // Internal
  _setupRealtimeSubscription: () => void;
  _cleanupRealtimeSubscription: () => void;
}

// ============= Store =============
export const useWishlistStore = create<WishlistState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      items: [],
      loading: true,
      userId: null,
      _realtimeChannel: null,

      setUserId: (userId) => {
        const currentUserId = get().userId;
        if (currentUserId === userId) return;
        
        set({ userId, items: [], loading: !!userId });
        
        if (userId) {
          get().fetchWishlist();
          get()._setupRealtimeSubscription();
        } else {
          get()._cleanupRealtimeSubscription();
        }
      },

      fetchWishlist: async () => {
        const { userId } = get();
        if (!userId) {
          set({ items: [], loading: false });
          return;
        }

        try {
          const { data, error } = await supabase
            .from('wishlist')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          set({ items: data || [], loading: false });
        } catch (error) {
          console.error('Error fetching wishlist:', error);
          set({ loading: false });
        }
      },

      addToWishlist: async (productId) => {
        const { userId, items } = get();
        
        if (!userId) {
          toast.error('Vous devez être connecté pour ajouter aux favoris');
          return false;
        }

        // Check if already in wishlist
        if (items.some(item => item.product_id === productId)) {
          return true;
        }

        try {
          const { data, error } = await supabase
            .from('wishlist')
            .insert({ user_id: userId, product_id: productId })
            .select()
            .single();

          if (error) throw error;

          // Optimistic update
          if (data) {
            set({ items: [data, ...items] });
          }

          // Haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }

          toast.success('Produit ajouté aux favoris', {
            action: {
              label: 'Voir mes favoris',
              onClick: () => {
                window.location.href = `/wishlist?highlight=${productId}`;
              }
            },
            cancel: {
              label: 'Annuler',
              onClick: async () => {
                await get().removeFromWishlist(productId);
                toast.success('Ajout annulé');
              }
            }
          });

          return true;
        } catch (error) {
          console.error('Error adding to wishlist:', error);
          toast.error("Erreur lors de l'ajout aux favoris");
          return false;
        }
      },

      removeFromWishlist: async (productId) => {
        const { userId, items } = get();
        if (!userId) return false;

        try {
          const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);

          if (error) throw error;

          // Optimistic update
          set({ items: items.filter(item => item.product_id !== productId) });
          toast.success('Produit retiré des favoris');
          return true;
        } catch (error) {
          console.error('Error removing from wishlist:', error);
          toast.error('Erreur lors de la suppression des favoris');
          return false;
        }
      },

      toggleWishlist: async (productId) => {
        const { items } = get();
        const isInWishlist = items.some(item => item.product_id === productId);
        
        if (isInWishlist) {
          return get().removeFromWishlist(productId);
        } else {
          return get().addToWishlist(productId);
        }
      },

      clearWishlist: () => {
        set({ items: [], loading: false });
      },

      _setupRealtimeSubscription: () => {
        const { userId, _realtimeChannel } = get();
        if (!userId || _realtimeChannel) return;

        const channel = supabase
          .channel(`wishlist-${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'wishlist',
              filter: `user_id=eq.${userId}`
            },
            (payload) => {
              const { items } = get();
              
              if (payload.eventType === 'INSERT') {
                const newItem = payload.new as WishlistItem;
                if (!items.some(item => item.id === newItem.id)) {
                  set({ items: [newItem, ...items] });
                }
              } else if (payload.eventType === 'DELETE') {
                const deletedId = (payload.old as WishlistItem).id;
                set({ items: items.filter(item => item.id !== deletedId) });
              }
            }
          )
          .subscribe();

        set({ _realtimeChannel: channel });
      },

      _cleanupRealtimeSubscription: () => {
        const { _realtimeChannel } = get();
        if (_realtimeChannel) {
          supabase.removeChannel(_realtimeChannel);
          set({ _realtimeChannel: null });
        }
      }
    })),
    { name: 'wishlist-store' }
  )
);

// ============= Selectors =============
export const selectWishlistItems = (state: WishlistState) => state.items;
export const selectWishlistCount = (state: WishlistState) => state.items.length;
export const selectWishlistLoading = (state: WishlistState) => state.loading;
export const selectIsInWishlist = (productId: number) => (state: WishlistState) => 
  state.items.some(item => item.product_id === productId);

// ============= Hook for compatibility =============
export const useWishlist = () => {
  const items = useWishlistStore(selectWishlistItems);
  const loading = useWishlistStore(selectWishlistLoading);
  const addToWishlist = useWishlistStore(state => state.addToWishlist);
  const removeFromWishlist = useWishlistStore(state => state.removeFromWishlist);
  const toggleWishlist = useWishlistStore(state => state.toggleWishlist);
  const fetchWishlist = useWishlistStore(state => state.fetchWishlist);

  return {
    wishlistItems: items,
    loading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist: (productId: number) => items.some(item => item.product_id === productId),
    toggleWishlist,
    refetch: fetchWishlist,
    wishlistCount: items.length
  };
};

// ============= Initialization =============
export const initializeWishlistStore = (userId: string | null) => {
  useWishlistStore.getState().setUserId(userId);
};
