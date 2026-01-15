import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings>(cachedSettings || DEFAULT_COMPANY_SETTINGS);
  const [isLoading, setIsLoading] = useState(!cachedSettings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
          .eq('setting_key', 'company_settings')
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (data?.setting_value) {
          const fetchedSettings = data.setting_value as unknown as Partial<CompanySettings>;
          const mergedSettings = {
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
          
          cachedSettings = mergedSettings;
          cacheTimestamp = Date.now();
          setSettings(mergedSettings);
        } else {
          // No settings found, use defaults
          cachedSettings = DEFAULT_COMPANY_SETTINGS;
          cacheTimestamp = Date.now();
          setSettings(DEFAULT_COMPANY_SETTINGS);
        }
      } catch (err) {
        console.error('Error fetching company settings:', err);
        setError('Erreur lors du chargement des paramètres');
        setSettings(DEFAULT_COMPANY_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

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
