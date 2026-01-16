/**
 * Company Settings Hook
 * Fetches and caches company settings from the database
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { handleError, DatabaseError } from '@/lib/errors/AppError';
import { APP_CONFIG } from '@/config';

export interface CompanyAddress {
  street: string;
  postalCode: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface CompanySettings {
  name: string;
  email: string;
  phone: string;
  address: CompanyAddress;
  openingHours: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
}

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: "Rif Raw Straw",
  email: "contact@rifstraw.com",
  phone: "+33 1 23 45 67 89",
  address: {
    street: "6 allée de la Sèvre",
    postalCode: "44400",
    city: "Rezé",
    country: "France",
    latitude: 47.1847,
    longitude: -1.5493,
  },
  openingHours: {
    weekdays: "Lundi - Vendredi: 9h - 18h",
    saturday: "Samedi: 10h - 16h",
    sunday: "Dimanche: Fermé",
  },
};

// Cache for company settings
let cachedSettings: CompanySettings | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = APP_CONFIG.cache.apiResponseTTL;

const SETTINGS_KEY = 'company_settings';

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings>(cachedSettings || DEFAULT_COMPANY_SETTINGS);
  const [isLoading, setIsLoading] = useState(!cachedSettings);
  const [error, setError] = useState<string | null>(null);

  const parseSettings = useCallback((rawValue: unknown): CompanySettings => {
    const fetchedSettings: Partial<CompanySettings> =
      typeof rawValue === 'object' && rawValue !== null && !Array.isArray(rawValue)
        ? (rawValue as Partial<CompanySettings>)
        : {};

    return {
      ...DEFAULT_COMPANY_SETTINGS,
      ...fetchedSettings,
      address: {
        ...DEFAULT_COMPANY_SETTINGS.address,
        ...(fetchedSettings.address || {}),
      },
      openingHours: {
        ...DEFAULT_COMPANY_SETTINGS.openingHours,
        ...(fetchedSettings.openingHours || {}),
      },
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      // Use cache if valid
      if (cachedSettings && Date.now() - cacheTimestamp < CACHE_DURATION) {
        setSettings(cachedSettings);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', SETTINGS_KEY)
          .maybeSingle();

        if (!isMounted) return;

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new DatabaseError(`Failed to fetch company settings: ${fetchError.message}`, fetchError.code);
        }

        const mergedSettings = data?.setting_value 
          ? parseSettings(data.setting_value)
          : DEFAULT_COMPANY_SETTINGS;
        
        cachedSettings = mergedSettings;
        cacheTimestamp = Date.now();
        setSettings(mergedSettings);
      } catch (err) {
        handleError(err, 'useCompanySettings.fetchSettings');
        if (isMounted) {
          setError('Erreur lors du chargement des paramètres');
          setSettings(DEFAULT_COMPANY_SETTINGS);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, [parseSettings]);

  return { settings, isLoading, error };
}

// Utility function to format the full address
export function formatFullAddress(address: CompanyAddress): string {
  return `${address.street}, ${address.postalCode} ${address.city}`;
}

// Utility function to invalidate cache (useful after admin updates)
export function invalidateCompanySettingsCache() {
  cachedSettings = null;
  cacheTimestamp = 0;
}

// Selector hooks for specific parts
export function useCompanyAddress() {
  const { settings, isLoading, error } = useCompanySettings();
  return { address: settings.address, isLoading, error };
}

export function useCompanyContact() {
  const { settings, isLoading, error } = useCompanySettings();
  return { 
    name: settings.name,
    email: settings.email, 
    phone: settings.phone, 
    isLoading, 
    error 
  };
}

export default useCompanySettings;
