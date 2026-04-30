import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOptimizedAuth } from '@/context/AuthContext';
import { getBusinessRules } from '@/hooks/useBusinessRules';
import {
  resolveCartSyncPolicy,
  isWishlistCloudSyncAllowed,
} from '@/lib/cart/cartSyncPolicy';
import { wishlistQueryKeys } from '@/lib/checkout/queryKeys';
import { queryClient } from '@/lib/queryClient';
import type { WishlistRow } from '@/services/wishlistApi';
import * as wishlistApi from '@/services/wishlistApi';

export type WishlistItem = WishlistRow;

const elevatedWishlistKey = (userId: string) =>
  `wishlist-elevated-ids:${userId}`;

function readElevatedProductIds(userId: string): number[] {
  try {
    const raw = localStorage.getItem(elevatedWishlistKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === 'number');
  } catch {
    return [];
  }
}

function writeElevatedProductIds(userId: string, productIds: number[]) {
  try {
    localStorage.setItem(
      elevatedWishlistKey(userId),
      JSON.stringify(productIds)
    );
  } catch {
    /* ignore */
  }
}

function idsToWishlistItems(userId: string, ids: number[]): WishlistItem[] {
  return ids.map((product_id) => ({
    id: `elevated-${product_id}`,
    user_id: userId,
    product_id,
    created_at: new Date().toISOString(),
  }));
}

function getWishlistLimits() {
  const rules = getBusinessRules();
  return { maxItems: rules.wishlist.maxItems };
}

/** Called from AuthContext on session changes — keeps RQ cache aligned with auth. */
export function initializeWishlistStore(userId: string | null): void {
  if (userId) {
    void queryClient.invalidateQueries({
      queryKey: wishlistQueryKeys.list(userId),
    });
  } else {
    queryClient.removeQueries({ queryKey: wishlistQueryKeys.all });
  }
}

export function useWishlist() {
  const { user } = useOptimizedAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();
  const [policyReady, setPolicyReady] = useState(false);
  const [elevatedIds, setElevatedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!userId) {
      setPolicyReady(false);
      setElevatedIds([]);
      return;
    }
    let cancelled = false;
    void resolveCartSyncPolicy(userId).then(() => {
      if (cancelled) return;
      setPolicyReady(true);
      if (!isWishlistCloudSyncAllowed()) {
        setElevatedIds(readElevatedProductIds(userId));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const cloudAllowed = !!userId && policyReady && isWishlistCloudSyncAllowed();

  const {
    data: cloudItems = [],
    isLoading: cloudLoading,
    refetch,
  } = useQuery({
    queryKey: wishlistQueryKeys.list(userId ?? ''),
    queryFn: () => wishlistApi.fetchWishlistForUser(userId!),
    enabled: cloudAllowed,
  });

  useEffect(() => {
    if (!userId || !cloudAllowed) return;
    const channel = wishlistApi.subscribeWishlistChanges(userId, () => {
      void qc.invalidateQueries({
        queryKey: wishlistQueryKeys.list(userId),
      });
    });
    return () => wishlistApi.removeWishlistChannel(channel);
  }, [userId, cloudAllowed, qc]);

  const items = useMemo(() => {
    if (!userId) return [];
    if (cloudAllowed) return cloudItems;
    return idsToWishlistItems(userId, elevatedIds);
  }, [userId, cloudAllowed, cloudItems, elevatedIds]);

  const policyLoading = !!userId && !policyReady;
  const loading =
    policyLoading || (!!userId && cloudAllowed ? cloudLoading : false);

  const addMutation = useMutation({
    mutationFn: async (productId: number) => {
      if (!userId) throw new Error('no_user');
      if (!cloudAllowed) {
        const { maxItems } = getWishlistLimits();
        const ids = readElevatedProductIds(userId);
        if (ids.includes(productId)) return null;
        if (ids.length >= maxItems) throw new Error('limit');
        const next = [productId, ...ids.filter((id) => id !== productId)];
        writeElevatedProductIds(userId, next);
        setElevatedIds(next);
        if ('vibrate' in navigator) navigator.vibrate(50);
        toast.success('Produit ajouté aux favoris (session admin, local)', {
          description:
            'Non synchronisé avec le compte client pour éviter les mélanges.',
        });
        return null;
      }
      return wishlistApi.insertWishlistItem(userId, productId);
    },
    onSuccess: (data, productId) => {
      if (!userId || !cloudAllowed || !data) return;
      qc.setQueryData(
        wishlistQueryKeys.list(userId),
        (old: WishlistItem[] | undefined) => {
          const prev = old ?? [];
          const withoutDup = prev.filter(
            (r) => r.product_id !== data.product_id
          );
          return [data, ...withoutDup];
        }
      );
      if ('vibrate' in navigator) navigator.vibrate(50);
      toast.success('Produit ajouté aux favoris', {
        action: {
          label: 'Voir mes favoris',
          onClick: () => {
            window.location.href = `/wishlist?highlight=${productId}`;
          },
        },
        cancel: {
          label: 'Annuler',
          onClick: async () => {
            await wishlistApi.deleteWishlistItem(userId, productId);
            qc.setQueryData(
              wishlistQueryKeys.list(userId),
              (old: WishlistItem[] | undefined) =>
                (old ?? []).filter((r) => r.product_id !== productId)
            );
            toast.success('Ajout annulé');
          },
        },
      });
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === 'limit') {
        const { maxItems } = getWishlistLimits();
        toast.warning('Limite de favoris atteinte', {
          description: `Maximum ${maxItems} produits dans vos favoris.`,
        });
        return;
      }
      toast.error("Erreur lors de l'ajout aux favoris");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (productId: number) => {
      if (!userId) throw new Error('no_user');
      if (!cloudAllowed) {
        const ids = readElevatedProductIds(userId).filter(
          (id) => id !== productId
        );
        writeElevatedProductIds(userId, ids);
        setElevatedIds(ids);
        return;
      }
      await wishlistApi.deleteWishlistItem(userId, productId);
    },
    onSuccess: (_void, productId) => {
      if (userId && cloudAllowed) {
        qc.setQueryData(
          wishlistQueryKeys.list(userId),
          (old: WishlistItem[] | undefined) =>
            (old ?? []).filter((r) => r.product_id !== productId)
        );
      }
      toast.success('Produit retiré des favoris');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression des favoris');
    },
  });

  const addToWishlist = useCallback(
    async (productId: number): Promise<boolean> => {
      if (!userId) {
        toast.error('Vous devez être connecté pour ajouter aux favoris');
        return false;
      }
      if (!policyReady) return false;
      if (items.some((item) => item.product_id === productId)) return true;
      if (cloudAllowed) {
        const { maxItems } = getWishlistLimits();
        if (items.length >= maxItems) {
          toast.warning('Limite de favoris atteinte', {
            description: `Maximum ${maxItems} produits dans vos favoris.`,
          });
          return false;
        }
      }
      try {
        await addMutation.mutateAsync(productId);
        return true;
      } catch {
        return false;
      }
    },
    [userId, policyReady, items, cloudAllowed, addMutation]
  );

  const removeFromWishlist = useCallback(
    async (productId: number): Promise<boolean> => {
      if (!userId) return false;
      try {
        await removeMutation.mutateAsync(productId);
        return true;
      } catch {
        return false;
      }
    },
    [userId, removeMutation]
  );

  const toggleWishlist = useCallback(
    async (productId: number): Promise<boolean> => {
      const inList = items.some((item) => item.product_id === productId);
      if (inList) return removeFromWishlist(productId);
      return addToWishlist(productId);
    },
    [items, removeFromWishlist, addToWishlist]
  );

  return {
    wishlistItems: items,
    loading: loading || addMutation.isPending || removeMutation.isPending,
    addToWishlist,
    removeFromWishlist,
    isInWishlist: (productId: number) =>
      items.some((item) => item.product_id === productId),
    toggleWishlist,
    refetch: () => void refetch(),
    wishlistCount: items.length,
  };
}
