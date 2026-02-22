// src/hooks/useBusinessRules.ts
// Hook to load and cache business rules from app_settings

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Default values (fallback if DB fetch fails)
export const DEFAULT_BUSINESS_RULES: BusinessRules = {
  cart: {
    maxQuantityPerItem: 10,
    maxProductTypes: 10,
    highValueThreshold: 1000,
    minOrderAmount: 0,
    maxOrderAmount: 10000,
  },
  wishlist: {
    maxItems: 10,
  },
  checkout: {
    requireEmailVerification: false,
    allowGuestCheckout: true,
    showVipContactForHighValue: true,
  },
  contact: {
    vipEmail: 'vip@rifrawstraw.com',
    vipPhone: '+33600000000',
  },
};

export interface BusinessRules {
  cart: {
    maxQuantityPerItem: number;
    maxProductTypes: number;
    highValueThreshold: number;
    minOrderAmount: number;
    maxOrderAmount: number;
  };
  wishlist: {
    maxItems: number;
  };
  checkout: {
    requireEmailVerification: boolean;
    allowGuestCheckout: boolean;
    showVipContactForHighValue: boolean;
  };
  contact: {
    vipEmail: string;
    vipPhone: string;
  };
}

interface BusinessRulesState {
  rules: BusinessRules;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Cache the rules globally to avoid refetching
let cachedRules: BusinessRules | null = null;
let fetchPromise: Promise<BusinessRules> | null = null;

async function fetchBusinessRules(): Promise<BusinessRules> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'business_rules')
      .single();

    if (error) {
      console.warn(
        'Failed to fetch business rules, using defaults:',
        error.message
      );
      return DEFAULT_BUSINESS_RULES;
    }

    // Merge with defaults to ensure all keys exist
    const fetchedRules = (data?.setting_value as Partial<BusinessRules>) || {};

    return {
      cart: { ...DEFAULT_BUSINESS_RULES.cart, ...fetchedRules.cart },
      wishlist: {
        ...DEFAULT_BUSINESS_RULES.wishlist,
        ...fetchedRules.wishlist,
      },
      checkout: {
        ...DEFAULT_BUSINESS_RULES.checkout,
        ...fetchedRules.checkout,
      },
      contact: { ...DEFAULT_BUSINESS_RULES.contact, ...fetchedRules.contact },
    };
  } catch (err) {
    console.error('Error fetching business rules:', err);
    return DEFAULT_BUSINESS_RULES;
  }
}

export function useBusinessRules(): BusinessRulesState {
  const [rules, setRules] = useState<BusinessRules>(
    cachedRules || DEFAULT_BUSINESS_RULES
  );
  const [loading, setLoading] = useState(!cachedRules);
  const [error, setError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    // If already cached, use cache
    if (cachedRules) {
      setRules(cachedRules);
      setLoading(false);
      return;
    }

    // If fetch in progress, wait for it
    if (fetchPromise) {
      const result = await fetchPromise;
      setRules(result);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      fetchPromise = fetchBusinessRules();
      const result = await fetchPromise;
      cachedRules = result;
      setRules(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load business rules'
      );
      setRules(DEFAULT_BUSINESS_RULES);
    } finally {
      setLoading(false);
      fetchPromise = null;
    }
  }, []);

  const refetch = useCallback(async () => {
    // Force refetch by clearing cache
    cachedRules = null;
    fetchPromise = null;
    await loadRules();
  }, [loadRules]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  return { rules, loading, error, refetch };
}

// Synchronous accessor for stores (uses cached value or defaults)
export function getBusinessRules(): BusinessRules {
  return cachedRules || DEFAULT_BUSINESS_RULES;
}

// Async initializer (call once at app startup)
export async function initializeBusinessRules(): Promise<BusinessRules> {
  if (cachedRules) return cachedRules;

  if (!fetchPromise) {
    fetchPromise = fetchBusinessRules();
  }

  cachedRules = await fetchPromise;
  fetchPromise = null;
  return cachedRules;
}

// Clear cache (useful for testing or admin updates)
export function clearBusinessRulesCache(): void {
  cachedRules = null;
  fetchPromise = null;
}
