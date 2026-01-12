// src/hooks/useCheckoutFormPersistence.ts
// Hook to persist and restore checkout form data from session storage and user profile

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeGetItem, safeSetItem, safeRemoveItem, StorageTTL } from '@/lib/storage/safeStorage';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

// Storage keys for checkout data
const CHECKOUT_FORM_KEY = 'checkout_form_data';
const CHECKOUT_STEP_KEY = 'checkout_current_step';
const CHECKOUT_COMPLETED_STEPS_KEY = 'checkout_completed_steps';

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
}

export function useCheckoutFormPersistence(): UseCheckoutFormPersistenceReturn {
  const { user } = useOptimizedAuth();
  const [formData, setFormData] = useState<CheckoutFormData>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [savedStep, setSavedStep] = useState(1);
  const [savedCompletedSteps, setSavedCompletedSteps] = useState<number[]>([]);
  const hasInitialized = useRef(false);

  // Load data on mount - first from cache, then from profile if logged in
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadFormData = async () => {
      setIsLoading(true);
      let loadedData: Partial<CheckoutFormData> = {};

      // Step 1: Try to load from session storage (most recent data)
      const cachedData = safeGetItem<CheckoutFormData>(CHECKOUT_FORM_KEY, {
        storage: 'sessionStorage',
      });

      if (cachedData) {
        loadedData = { ...cachedData };
      }

      // Load saved step state
      const cachedStep = safeGetItem<number>(CHECKOUT_STEP_KEY, {
        storage: 'sessionStorage',
      });
      const cachedCompletedSteps = safeGetItem<number[]>(CHECKOUT_COMPLETED_STEPS_KEY, {
        storage: 'sessionStorage',
      });

      if (cachedStep && cachedStep >= 1 && cachedStep <= 3) {
        setSavedStep(cachedStep);
      }
      if (cachedCompletedSteps && Array.isArray(cachedCompletedSteps)) {
        setSavedCompletedSteps(cachedCompletedSteps);
      }

      // Step 2: If user is logged in, fill missing fields from profile
      if (user) {
        try {
          // Fetch profile data
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, phone, address_line1, address_line2, city, postal_code, country')
            .eq('id', user.id)
            .maybeSingle();

          if (!profileError && profile) {
            // Parse full_name into firstName and lastName
            const nameParts = (profile.full_name || '').trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Map country to supported values
            const countryMap: Record<string, 'FR' | 'BE' | 'CH' | 'MC' | 'LU'> = {
              'France': 'FR',
              'FR': 'FR',
              'Belgique': 'BE',
              'BE': 'BE',
              'Suisse': 'CH',
              'CH': 'CH',
              'Monaco': 'MC',
              'MC': 'MC',
              'Luxembourg': 'LU',
              'LU': 'LU',
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
            if (!loadedData.addressComplement && shippingAddress.address_line2) {
              loadedData.addressComplement = shippingAddress.address_line2;
            }
            if (!loadedData.city && shippingAddress.city) {
              loadedData.city = shippingAddress.city;
            }
            if (!loadedData.postalCode && shippingAddress.postal_code) {
              loadedData.postalCode = shippingAddress.postal_code;
            }
            if (!loadedData.country) {
              const countryCode = shippingAddress.country_code as 'FR' | 'BE' | 'CH' | 'MC' | 'LU';
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
    };

    loadFormData();
  }, [user]);

  // Save form data to session storage whenever it changes
  const saveFormData = useCallback(() => {
    // Only save if there's meaningful data
    const hasData = formData.firstName || formData.lastName || formData.email || 
                    formData.address || formData.city;
    
    if (hasData) {
      safeSetItem(CHECKOUT_FORM_KEY, formData, {
        storage: 'sessionStorage',
        ttl: StorageTTL.SESSION, // 30 minutes
      });
    }
  }, [formData]);

  // Save step state
  const saveStepState = useCallback((step: number, completedSteps: number[]) => {
    safeSetItem(CHECKOUT_STEP_KEY, step, {
      storage: 'sessionStorage',
      ttl: StorageTTL.SESSION,
    });
    safeSetItem(CHECKOUT_COMPLETED_STEPS_KEY, completedSteps, {
      storage: 'sessionStorage',
      ttl: StorageTTL.SESSION,
    });
    setSavedStep(step);
    setSavedCompletedSteps(completedSteps);
  }, []);

  // Auto-save on form data change (debounced via useEffect)
  useEffect(() => {
    if (isLoading) return;
    
    const timeoutId = setTimeout(() => {
      saveFormData();
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [formData, isLoading, saveFormData]);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    safeRemoveItem(CHECKOUT_FORM_KEY, { storage: 'sessionStorage' });
    safeRemoveItem(CHECKOUT_STEP_KEY, { storage: 'sessionStorage' });
    safeRemoveItem(CHECKOUT_COMPLETED_STEPS_KEY, { storage: 'sessionStorage' });
    setFormData(EMPTY_FORM);
    setSavedStep(1);
    setSavedCompletedSteps([]);
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
  };
}

export default useCheckoutFormPersistence;
