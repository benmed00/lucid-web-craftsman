// src/context/CurrencyContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { safeGetItem, safeSetItem, StorageKeys, StorageTTL } from '@/lib/storage/safeStorage';
import { cache, CacheTTL, CacheTags } from '@/lib/cache/UnifiedCache';

export type Currency = 'EUR' | 'USD' | 'GBP' | 'MAD';

interface ExchangeRates {
  EUR: Record<Currency, number>;
  USD: Record<Currency, number>;
  GBP: Record<Currency, number>;
  MAD: Record<Currency, number>;
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (price: number) => string;
  convertPrice: (price: number, fromCurrency?: Currency) => number;
  isLoading: boolean;
  lastUpdated: Date | null;
  refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Default exchange rates (fallback when API fails)
const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  EUR: { EUR: 1, USD: 1.09, GBP: 0.86, MAD: 10.85 },
  USD: { EUR: 0.92, USD: 1, GBP: 0.79, MAD: 9.95 },
  GBP: { EUR: 1.16, USD: 1.27, GBP: 1, MAD: 12.62 },
  MAD: { EUR: 0.092, USD: 0.10, GBP: 0.079, MAD: 1 }
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  MAD: 'DH'
};

const CURRENCY_LOCALE: Record<Currency, string> = {
  EUR: 'fr-FR',
  USD: 'en-US',
  GBP: 'en-GB',
  MAD: 'fr-MA'
};

// Cache key for exchange rates
const RATES_CACHE_KEY = 'exchange_rates';

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load persisted currency preference
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = safeGetItem<Currency>(StorageKeys.CURRENCY);
    return saved && ['EUR', 'USD', 'GBP', 'MAD'].includes(saved) ? saved : 'EUR';
  });
  
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Persist currency preference
  const setCurrency = useCallback((newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    safeSetItem(StorageKeys.CURRENCY, newCurrency, { ttl: StorageTTL.MONTH });
  }, []);

  // Fetch exchange rates from API (with caching)
  const fetchExchangeRates = useCallback(async (): Promise<ExchangeRates | null> => {
    try {
      // Try to get from cache first
      const cached = cache.get<ExchangeRates>(RATES_CACHE_KEY);
      if (cached.data && !cached.isExpired) {
        return cached.data;
      }

      // Fetch from exchangerate.host API (free, no key required)
      const response = await fetch(
        'https://api.exchangerate.host/latest?base=EUR&symbols=USD,GBP,MAD'
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }
      
      const data = await response.json();
      
      if (!data.success || !data.rates) {
        throw new Error('Invalid exchange rate response');
      }

      const rates = data.rates as { USD: number; GBP: number; MAD: number };
      
      // Build full exchange rate matrix
      const newRates: ExchangeRates = {
        EUR: { EUR: 1, USD: rates.USD, GBP: rates.GBP, MAD: rates.MAD },
        USD: { 
          EUR: 1 / rates.USD, 
          USD: 1, 
          GBP: rates.GBP / rates.USD, 
          MAD: rates.MAD / rates.USD 
        },
        GBP: { 
          EUR: 1 / rates.GBP, 
          USD: rates.USD / rates.GBP, 
          GBP: 1, 
          MAD: rates.MAD / rates.GBP 
        },
        MAD: { 
          EUR: 1 / rates.MAD, 
          USD: rates.USD / rates.MAD, 
          GBP: rates.GBP / rates.MAD, 
          MAD: 1 
        }
      };

      // Cache for 1 hour
      cache.set(RATES_CACHE_KEY, newRates, { 
        ttl: CacheTTL.HOUR, 
        staleTime: CacheTTL.MEDIUM,
        tags: [CacheTags.PROFILE] 
      });

      return newRates;
    } catch (error) {
      console.warn('Failed to fetch exchange rates, using defaults:', error);
      return null;
    }
  }, []);

  // Refresh rates
  const refreshRates = useCallback(async () => {
    setIsLoading(true);
    try {
      cache.invalidate(RATES_CACHE_KEY);
      const rates = await fetchExchangeRates();
      if (rates) {
        setExchangeRates(rates);
        setLastUpdated(new Date());
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchExchangeRates]);

  // Load exchange rates on mount
  useEffect(() => {
    const loadRates = async () => {
      setIsLoading(true);
      try {
        const rates = await fetchExchangeRates();
        if (rates) {
          setExchangeRates(rates);
          setLastUpdated(new Date());
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRates();
    
    // Refresh rates every hour
    const interval = setInterval(loadRates, CacheTTL.HOUR);
    return () => clearInterval(interval);
  }, [fetchExchangeRates]);

  const convertPrice = useCallback((price: number, fromCurrency: Currency = 'EUR'): number => {
    if (fromCurrency === currency) return price;
    const rate = exchangeRates[fromCurrency]?.[currency] ?? 1;
    return Math.round(price * rate * 100) / 100;
  }, [currency, exchangeRates]);

  const formatPrice = useCallback((price: number): string => {
    const convertedPrice = convertPrice(price);
    
    try {
      // Use Intl.NumberFormat for proper localization
      return new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
        style: 'currency',
        currency: currency === 'MAD' ? 'MAD' : currency,
        minimumFractionDigits: currency === 'EUR' ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(convertedPrice);
    } catch {
      // Fallback formatting
      const symbol = CURRENCY_SYMBOLS[currency];
      switch (currency) {
        case 'USD':
        case 'GBP':
          return `${symbol}${convertedPrice.toFixed(2)}`;
        case 'MAD':
          return `${convertedPrice.toFixed(2)} ${symbol}`;
        case 'EUR':
        default:
          return `${convertedPrice.toFixed(0)} ${symbol}`;
      }
    }
  }, [currency, convertPrice]);

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      formatPrice, 
      convertPrice,
      isLoading,
      lastUpdated,
      refreshRates
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
