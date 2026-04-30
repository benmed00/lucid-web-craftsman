// src/hooks/useCheckoutFormPersistence.ts
// Persists checkout form to localStorage (and optional DB). Elevated storefront users use
// `getCheckoutStorageKeys(true)` and skip `checkout_sessions` hydration so admin drafts
// never load another user's in-progress row.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchCheckoutFormSnapshotByGuestId,
  fetchCheckoutFormSnapshotByUserId,
} from '@/services/checkoutApi';
import {
  fetchDefaultShippingAddress,
  fetchProfileCheckoutPrefill,
} from '@/services/profileApi';
import {
  isValidPersonalInfo,
  isValidShippingInfo,
} from '@/utils/checkoutSessionValidation';
import {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  StorageTTL,
} from '@/lib/storage/safeStorage';
import { useOptimizedAuth } from '@/context/AuthContext';
import {
  resolveCartSyncPolicy,
  isElevatedStorefrontUser,
} from '@/lib/cart/cartSyncPolicy';
import { getCheckoutStorageKeys } from '@/lib/checkout/checkoutStorageKeys';

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
  const checkoutKeysRef = useRef(getCheckoutStorageKeys(false));

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

      await resolveCartSyncPolicy(user?.id ?? null);
      const elevated = isElevatedStorefrontUser();
      const k = getCheckoutStorageKeys(elevated);
      checkoutKeysRef.current = k;

      // Check if checkout data is still valid (24h TTL)
      const timestamp = safeGetItem<number>(k.timestamp, {
        storage: 'localStorage',
      });
      // 24-hour TTL — matches DB checkout_sessions.expires_at
      const isExpired =
        !timestamp || Date.now() - timestamp > 24 * 60 * 60 * 1000;

      // Step 1: Try to load from localStorage first (persists across redirects like Stripe)
      // Then fall back to sessionStorage for backward compatibility
      let cachedData = safeGetItem<CheckoutFormData>(k.form, {
        storage: 'localStorage',
      });

      if (!cachedData || isExpired) {
        cachedData = safeGetItem<CheckoutFormData>(k.form, {
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
            guestId =
              parsed?.data?.guestId ||
              parsed?.data?.guest_id ||
              parsed?.guestId ||
              parsed?.guest_id ||
              parsed?.value?.guestId ||
              parsed?.value?.guest_id ||
              null;
          }

          let dbSession: any = null;

          if (userId && !elevated) {
            dbSession = await fetchCheckoutFormSnapshotByUserId(userId);
          } else if (guestId && !elevated) {
            dbSession = await fetchCheckoutFormSnapshotByGuestId(guestId);
          }

          if (dbSession) {
            const pi = dbSession.personal_info as any;
            const si = dbSession.shipping_info as any;

            // Validate personal info before hydrating — reject empty/invalid data
            if (
              pi &&
              isValidPersonalInfo({
                first_name: pi.first_name,
                last_name: pi.last_name,
                email: pi.email,
              })
            ) {
              loadedData.firstName = pi.first_name || '';
              loadedData.lastName = pi.last_name || '';
              loadedData.email = pi.email || '';
              loadedData.phone = pi.phone || '';
            } else if (pi) {
              console.warn(
                '[useCheckoutFormPersistence] Invalid personal_info in DB session — skipping hydration'
              );
            }

            // Validate shipping info before hydrating
            if (
              si &&
              isValidShippingInfo({
                address_line1: si.address_line1,
                city: si.city,
                country: si.country,
              })
            ) {
              loadedData.address = si.address_line1 || '';
              loadedData.addressComplement = si.address_line2 || '';
              loadedData.postalCode = si.postal_code || '';
              loadedData.city = si.city || '';
              const validCountries = ['FR', 'BE', 'CH', 'MC', 'LU'];
              loadedData.country = validCountries.includes(si.country)
                ? si.country
                : 'FR';
            } else if (si) {
              console.warn(
                '[useCheckoutFormPersistence] Invalid shipping_info in DB session — skipping hydration'
              );
            }

            // Restore step/completed from DB session only if data is valid
            const hasValidPI = isValidPersonalInfo({
              first_name: pi?.first_name,
              last_name: pi?.last_name,
              email: pi?.email,
            });
            if (dbSession.last_completed_step >= 1 && hasValidPI) {
              const completedFromDb = Array.from(
                { length: dbSession.last_completed_step },
                (_, i) => i + 1
              );
              setSavedStep(
                dbSession.current_step || dbSession.last_completed_step + 1
              );
              setSavedCompletedSteps(completedFromDb);
            }

            console.log(
              '[useCheckoutFormPersistence] Rehydrated from DB checkout_session'
            );

            // Re-persist to localStorage so future loads are fast
            safeSetItem(k.timestamp, Date.now(), {
              storage: 'localStorage',
            });
          }
        } catch (dbErr) {
          console.warn(
            '[useCheckoutFormPersistence] DB fallback failed (non-blocking):',
            dbErr
          );
        }
      }

      // Load saved step state from localStorage (persists across redirects)
      let cachedStep = safeGetItem<number>(k.step, {
        storage: 'localStorage',
      });
      let cachedCompletedSteps = safeGetItem<number[]>(k.completed, {
        storage: 'localStorage',
      });

      // Fall back to sessionStorage
      if (!cachedStep && !isExpired) {
        cachedStep = safeGetItem<number>(k.step, {
          storage: 'sessionStorage',
        });
      }
      if (!cachedCompletedSteps && !isExpired) {
        cachedCompletedSteps = safeGetItem<number[]>(k.completed, {
          storage: 'sessionStorage',
        });
      }

      if (cachedStep && cachedStep >= 1 && cachedStep <= 3) {
        setSavedStep(cachedStep);
      }
      if (cachedCompletedSteps && Array.isArray(cachedCompletedSteps)) {
        setSavedCompletedSteps(cachedCompletedSteps);
      }

      // Load saved coupon
      const cachedCoupon = safeGetItem<SavedCoupon>(k.coupon, {
        storage: 'localStorage',
      });
      if (cachedCoupon && !isExpired) {
        setSavedCoupon(cachedCoupon);
      }

      // Step 2: If user is logged in, fill missing fields from profile
      if (user) {
        try {
          // Fetch profile data
          let profile: Awaited<ReturnType<typeof fetchProfileCheckoutPrefill>> =
            null;
          try {
            profile = await fetchProfileCheckoutPrefill(user.id);
          } catch {
            profile = null;
          }

          if (profile) {
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
          let shippingAddress: Awaited<
            ReturnType<typeof fetchDefaultShippingAddress>
          > = null;
          try {
            shippingAddress = await fetchDefaultShippingAddress(user.id);
          } catch {
            shippingAddress = null;
          }

          if (shippingAddress) {
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
      const keys = checkoutKeysRef.current;
      // Save to both localStorage (for persistence across redirects) and sessionStorage (for backward compat)
      safeSetItem(keys.form, formData, {
        storage: 'localStorage',
      });
      safeSetItem(keys.form, formData, {
        storage: 'sessionStorage',
        ttl: StorageTTL.SESSION,
      });
      // Update timestamp
      safeSetItem(keys.timestamp, Date.now(), {
        storage: 'localStorage',
      });
    }
  }, [formData]);

  // Save step state - use localStorage for persistence across Stripe redirects
  const saveStepState = useCallback(
    (step: number, completedSteps: number[]) => {
      const keys = checkoutKeysRef.current;
      // Save to localStorage for persistence across redirects
      safeSetItem(keys.step, step, {
        storage: 'localStorage',
      });
      safeSetItem(keys.completed, completedSteps, {
        storage: 'localStorage',
      });
      // Also save to sessionStorage for backward compat
      safeSetItem(keys.step, step, {
        storage: 'sessionStorage',
        ttl: StorageTTL.SESSION,
      });
      safeSetItem(keys.completed, completedSteps, {
        storage: 'sessionStorage',
        ttl: StorageTTL.SESSION,
      });
      // Update timestamp
      safeSetItem(keys.timestamp, Date.now(), {
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
    const std = getCheckoutStorageKeys(false);
    const el = getCheckoutStorageKeys(true);
    const clearKeys = (keys: ReturnType<typeof getCheckoutStorageKeys>) => {
      safeRemoveItem(keys.form, { storage: 'localStorage' });
      safeRemoveItem(keys.step, { storage: 'localStorage' });
      safeRemoveItem(keys.completed, { storage: 'localStorage' });
      safeRemoveItem(keys.timestamp, { storage: 'localStorage' });
      safeRemoveItem(keys.coupon, { storage: 'localStorage' });
      safeRemoveItem(keys.form, { storage: 'sessionStorage' });
      safeRemoveItem(keys.step, { storage: 'sessionStorage' });
      safeRemoveItem(keys.completed, { storage: 'sessionStorage' });
    };
    clearKeys(std);
    clearKeys(el);
    setFormData(EMPTY_FORM);
    setSavedStep(1);
    setSavedCompletedSteps([]);
    setSavedCoupon(null);
  }, []);

  // Save coupon to localStorage
  const saveCoupon = useCallback((coupon: SavedCoupon | null) => {
    const keys = checkoutKeysRef.current;
    if (coupon) {
      safeSetItem(keys.coupon, coupon, {
        storage: 'localStorage',
      });
      // Update timestamp
      safeSetItem(keys.timestamp, Date.now(), {
        storage: 'localStorage',
      });
    } else {
      safeRemoveItem(keys.coupon, { storage: 'localStorage' });
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
