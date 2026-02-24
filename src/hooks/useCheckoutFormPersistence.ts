// src/hooks/useCheckoutFormPersistence.ts
// Hook to persist and restore checkout form data from localStorage, DB session, and user profile

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  StorageTTL,
} from '@/lib/storage/safeStorage';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

// Storage keys for checkout data - use localStorage for persistence across tabs/redirects
const CHECKOUT_FORM_KEY = 'checkout_form_data';
const CHECKOUT_STEP_KEY = 'checkout_current_step';
const CHECKOUT_COMPLETED_STEPS_KEY = 'checkout_completed_steps';
const CHECKOUT_TIMESTAMP_KEY = 'checkout_timestamp';
const CHECKOUT_COUPON_KEY = 'checkout_applied_coupon';

export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  addressComplement: string;
  postalCode: string;
  city: string;
  country: 'FR' | 'BE' | 'CH' | 'MC' | 'LU';
}

export interface SavedCoupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minimum_order_amount: number | null;
  maximum_discount_amount: number | null;
  includes_free_shipping?: boolean;
}

const EMPTY_FORM: CheckoutFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  addressComplement: '',
  postalCode: '',
  city: '',
  country: 'FR',
};

interface CheckoutState {
  step: number;
  completedSteps: number[];
}

interface UseCheckoutFormPersistenceReturn {
  formData: CheckoutFormData;
  setFormData: React.Dispatch<React.SetStateAction<CheckoutFormData>>;
  isLoading: boolean;
  clearSavedData: () => void;
  saveFormData: () => void;
  // Step persistence
  savedStep: number;
  savedCompletedSteps: number[];
  saveStepState: (step: number, completedSteps: number[]) => void;
  // Coupon persistence
  savedCoupon: SavedCoupon | null;
  saveCoupon: (coupon: SavedCoupon | null) => void;
}

export function useCheckoutFormPersistence(): UseCheckoutFormPersistenceReturn {
  const { user } = useOptimizedAuth();
  const [formData, setFormData] = useState<CheckoutFormData>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [savedStep, setSavedStep] = useState(1);
  const [savedCompletedSteps, setSavedCompletedSteps] = useState<number[]>([]);
  const [savedCoupon, setSavedCoupon] = useState<SavedCoupon | null>(null);
  const hasInitialized = useRef(false);
  const previousUserId = useRef<string | undefined>(undefined);

  // Load data on mount — and re-merge if user signs in mid-checkout
  useEffect(() => {
    const userId = user?.id;
    const userChanged = userId !== previousUserId.current;
    previousUserId.current = userId;

    if (hasInitialized.current && !userChanged) return;
    hasInitialized.current = true;

    // Safety timeout: never block checkout for more than 3 seconds
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn(
          '[useCheckoutFormPersistence] Loading timed out, rendering form'
        );
        setIsLoading(false);
      }
    }, 3000);

    const loadFormData = async () => {
      setIsLoading(true);
      let loadedData: Partial<CheckoutFormData> = {};

      // Check if checkout data is still valid (24h TTL)
      const timestamp = safeGetItem<number>(CHECKOUT_TIMESTAMP_KEY, {
        storage: 'localStorage',
      });
      // 24-hour TTL — matches DB checkout_sessions.expires_at
      const isExpired = !timestamp || (Date.now() - timestamp) > 24 * 60 * 60 * 1000;

      // Step 1: Try to load from localStorage first (persists across redirects like Stripe)
      // Then fall back to sessionStorage for backward compatibility
      let cachedData = safeGetItem<CheckoutFormData>(CHECKOUT_FORM_KEY, {
        storage: 'localStorage',
      });

      if (!cachedData || isExpired) {
        cachedData = safeGetItem<CheckoutFormData>(CHECKOUT_FORM_KEY, {
          storage: 'sessionStorage',
        });
      }

      if (cachedData && !isExpired) {
        loadedData = { ...cachedData };
      } else {
        // DB FALLBACK: Rehydrate from checkout_sessions when localStorage is empty/expired
        try {
          const guestRaw = localStorage.getItem('guest_session');
          let guestId: string | null = null;
          if (guestRaw) {
            const parsed = JSON.parse(guestRaw);
            guestId = parsed?.data?.guestId || parsed?.data?.guest_id 
              || parsed?.guestId || parsed?.guest_id 
              || parsed?.value?.guestId || parsed?.value?.guest_id || null;
          }

          let dbSession: any = null;

          if (userId) {
            const { data } = await supabase
              .from('checkout_sessions')
              .select('personal_info, shipping_info, current_step, last_completed_step, promo_code, promo_code_valid, promo_discount_type, promo_discount_value, promo_discount_applied, promo_free_shipping')
              .eq('user_id', userId)
              .eq('status', 'in_progress')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            dbSession = data;
          } else if (guestId) {
            const { data } = await supabase
              .from('checkout_sessions')
              .select('personal_info, shipping_info, current_step, last_completed_step, promo_code, promo_code_valid, promo_discount_type, promo_discount_value, promo_discount_applied, promo_free_shipping')
              .eq('guest_id', guestId)
              .eq('status', 'in_progress')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            dbSession = data;
          }

          if (dbSession) {
            const pi = dbSession.personal_info as any;
            const si = dbSession.shipping_info as any;
            
            if (pi) {
              loadedData.firstName = pi.first_name || '';
              loadedData.lastName = pi.last_name || '';
              loadedData.email = pi.email || '';
              loadedData.phone = pi.phone || '';
            }
            if (si) {
              loadedData.address = si.address_line1 || '';
              loadedData.addressComplement = si.address_line2 || '';
              loadedData.postalCode = si.postal_code || '';
              loadedData.city = si.city || '';
              const validCountries = ['FR', 'BE', 'CH', 'MC', 'LU'];
              loadedData.country = validCountries.includes(si.country) ? si.country : 'FR';
            }

            // Restore step/completed from DB session
            if (dbSession.last_completed_step >= 1) {
              const completedFromDb = Array.from(
                { length: dbSession.last_completed_step },
                (_, i) => i + 1
              );
              setSavedStep(dbSession.current_step || dbSession.last_completed_step + 1);
              setSavedCompletedSteps(completedFromDb);
            }

            console.log('[useCheckoutFormPersistence] Rehydrated from DB checkout_session');
            
            // Re-persist to localStorage so future loads are fast
            safeSetItem(CHECKOUT_TIMESTAMP_KEY, Date.now(), { storage: 'localStorage' });
          }
        } catch (dbErr) {
          console.warn('[useCheckoutFormPersistence] DB fallback failed (non-blocking):', dbErr);
        }
      }

      // Load saved step state from localStorage (persists across redirects)
      let cachedStep = safeGetItem<number>(CHECKOUT_STEP_KEY, {
        storage: 'localStorage',
      });
      let cachedCompletedSteps = safeGetItem<number[]>(
        CHECKOUT_COMPLETED_STEPS_KEY,
        {
          storage: 'localStorage',
        }
      );

      // Fall back to sessionStorage
      if (!cachedStep && !isExpired) {
        cachedStep = safeGetItem<number>(CHECKOUT_STEP_KEY, {
          storage: 'sessionStorage',
        });
      }
      if (!cachedCompletedSteps && !isExpired) {
        cachedCompletedSteps = safeGetItem<number[]>(
          CHECKOUT_COMPLETED_STEPS_KEY,
          {
            storage: 'sessionStorage',
          }
        );
      }

      if (cachedStep && cachedStep >= 1 && cachedStep <= 3) {
        setSavedStep(cachedStep);
      }
      if (cachedCompletedSteps && Array.isArray(cachedCompletedSteps)) {
        setSavedCompletedSteps(cachedCompletedSteps);
      }

      // Load saved coupon
      const cachedCoupon = safeGetItem<SavedCoupon>(CHECKOUT_COUPON_KEY, {
        storage: 'localStorage',
      });
      if (cachedCoupon && !isExpired) {
        setSavedCoupon(cachedCoupon);
      }

      // Step 2: If user is logged in, fill missing fields from profile
      if (user) {
        try {
          // Fetch profile data
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(
              'full_name, phone, address_line1, address_line2, city, postal_code, country'
            )
            .eq('id', user.id)
            .maybeSingle();

          if (!profileError && profile) {
            // Parse full_name into firstName and lastName
            const nameParts = (profile.full_name || '').trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Map country to supported values
            const countryMap: Record<string, 'FR' | 'BE' | 'CH' | 'MC' | 'LU'> =
              {
                France: 'FR',
                FR: 'FR',
                Belgique: 'BE',
                BE: 'BE',
                Suisse: 'CH',
                CH: 'CH',
                Monaco: 'MC',
                MC: 'MC',
                Luxembourg: 'LU',
                LU: 'LU',
              };

            // Only fill fields that are empty in the cache
            if (!loadedData.firstName && firstName) {
              loadedData.firstName = firstName;
            }
            if (!loadedData.lastName && lastName) {
              loadedData.lastName = lastName;
            }
            if (!loadedData.email) {
              loadedData.email = user.email || '';
            }
            if (!loadedData.phone && profile.phone) {
              loadedData.phone = profile.phone;
            }
            if (!loadedData.address && profile.address_line1) {
              loadedData.address = profile.address_line1;
            }
            if (!loadedData.addressComplement && profile.address_line2) {
              loadedData.addressComplement = profile.address_line2;
            }
            if (!loadedData.city && profile.city) {
              loadedData.city = profile.city;
            }
            if (!loadedData.postalCode && profile.postal_code) {
              loadedData.postalCode = profile.postal_code;
            }
            if (!loadedData.country && profile.country) {
              loadedData.country = countryMap[profile.country] || 'FR';
            }
          }

          // Also try to fetch the default shipping address
          const { data: shippingAddress, error: shippingError } = await supabase
            .from('shipping_addresses')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .maybeSingle();

          if (!shippingError && shippingAddress) {
            // Shipping address takes priority if no cached data
            if (!loadedData.firstName && shippingAddress.first_name) {
              loadedData.firstName = shippingAddress.first_name;
            }
            if (!loadedData.lastName && shippingAddress.last_name) {
              loadedData.lastName = shippingAddress.last_name;
            }
            if (!loadedData.phone && shippingAddress.phone) {
              loadedData.phone = shippingAddress.phone;
            }
            if (!loadedData.address && shippingAddress.address_line1) {
              loadedData.address = shippingAddress.address_line1;
            }
            if (
              !loadedData.addressComplement &&
              shippingAddress.address_line2
            ) {
              loadedData.addressComplement = shippingAddress.address_line2;
            }
            if (!loadedData.city && shippingAddress.city) {
              loadedData.city = shippingAddress.city;
            }
            if (!loadedData.postalCode && shippingAddress.postal_code) {
              loadedData.postalCode = shippingAddress.postal_code;
            }
            if (!loadedData.country) {
              const countryCode = shippingAddress.country_code as
                | 'FR'
                | 'BE'
                | 'CH'
                | 'MC'
                | 'LU';
              if (['FR', 'BE', 'CH', 'MC', 'LU'].includes(countryCode)) {
                loadedData.country = countryCode;
              }
            }
          }
        } catch (error) {
          console.error('Error loading profile data for checkout:', error);
        }
      }

      // Merge with empty form to ensure all fields exist
      setFormData({
        ...EMPTY_FORM,
        ...loadedData,
      });

      setIsLoading(false);
      clearTimeout(safetyTimeout);
    };

    loadFormData();

    return () => clearTimeout(safetyTimeout);
  }, [user]);

  // Save form data to localStorage (persists across redirects like Stripe)
  const saveFormData = useCallback(() => {
    // Only save if there's meaningful data
    const hasData =
      formData.firstName ||
      formData.lastName ||
      formData.email ||
      formData.address ||
      formData.city;

    if (hasData) {
      // Save to both localStorage (for persistence across redirects) and sessionStorage (for backward compat)
      safeSetItem(CHECKOUT_FORM_KEY, formData, {
        storage: 'localStorage',
      });
      safeSetItem(CHECKOUT_FORM_KEY, formData, {
        storage: 'sessionStorage',
        ttl: StorageTTL.SESSION,
      });
      // Update timestamp
      safeSetItem(CHECKOUT_TIMESTAMP_KEY, Date.now(), {
        storage: 'localStorage',
      });
    }
  }, [formData]);

  // Save step state - use localStorage for persistence across Stripe redirects
  const saveStepState = useCallback(
    (step: number, completedSteps: number[]) => {
      // Save to localStorage for persistence across redirects
      safeSetItem(CHECKOUT_STEP_KEY, step, {
        storage: 'localStorage',
      });
      safeSetItem(CHECKOUT_COMPLETED_STEPS_KEY, completedSteps, {
        storage: 'localStorage',
      });
      // Also save to sessionStorage for backward compat
      safeSetItem(CHECKOUT_STEP_KEY, step, {
        storage: 'sessionStorage',
        ttl: StorageTTL.SESSION,
      });
      safeSetItem(CHECKOUT_COMPLETED_STEPS_KEY, completedSteps, {
        storage: 'sessionStorage',
        ttl: StorageTTL.SESSION,
      });
      // Update timestamp
      safeSetItem(CHECKOUT_TIMESTAMP_KEY, Date.now(), {
        storage: 'localStorage',
      });
      setSavedStep(step);
      setSavedCompletedSteps(completedSteps);
    },
    []
  );

  // Auto-save on form data change (debounced via useEffect)
  useEffect(() => {
    if (isLoading) return;

    const timeoutId = setTimeout(() => {
      saveFormData();
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [formData, isLoading, saveFormData]);

  // Clear saved data from both storages
  const clearSavedData = useCallback(() => {
    // Clear from localStorage
    safeRemoveItem(CHECKOUT_FORM_KEY, { storage: 'localStorage' });
    safeRemoveItem(CHECKOUT_STEP_KEY, { storage: 'localStorage' });
    safeRemoveItem(CHECKOUT_COMPLETED_STEPS_KEY, { storage: 'localStorage' });
    safeRemoveItem(CHECKOUT_TIMESTAMP_KEY, { storage: 'localStorage' });
    safeRemoveItem(CHECKOUT_COUPON_KEY, { storage: 'localStorage' });
    // Clear from sessionStorage
    safeRemoveItem(CHECKOUT_FORM_KEY, { storage: 'sessionStorage' });
    safeRemoveItem(CHECKOUT_STEP_KEY, { storage: 'sessionStorage' });
    safeRemoveItem(CHECKOUT_COMPLETED_STEPS_KEY, { storage: 'sessionStorage' });
    setFormData(EMPTY_FORM);
    setSavedStep(1);
    setSavedCompletedSteps([]);
    setSavedCoupon(null);
  }, []);

  // Save coupon to localStorage
  const saveCoupon = useCallback((coupon: SavedCoupon | null) => {
    if (coupon) {
      safeSetItem(CHECKOUT_COUPON_KEY, coupon, {
        storage: 'localStorage',
      });
      // Update timestamp
      safeSetItem(CHECKOUT_TIMESTAMP_KEY, Date.now(), {
        storage: 'localStorage',
      });
    } else {
      safeRemoveItem(CHECKOUT_COUPON_KEY, { storage: 'localStorage' });
    }
    setSavedCoupon(coupon);
  }, []);

  return {
    formData,
    setFormData,
    isLoading,
    clearSavedData,
    saveFormData,
    savedStep,
    savedCompletedSteps,
    saveStepState,
    savedCoupon,
    saveCoupon,
  };
}

export default useCheckoutFormPersistence;
