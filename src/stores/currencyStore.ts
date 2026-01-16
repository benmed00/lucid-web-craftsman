// src/stores/currencyStore.ts
// Zustand store for currency management with exchange rates

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { safeGetItem, safeSetItem, StorageKeys, StorageTTL } from '@/lib/storage/safeStorage';
import { cache, CacheTTL, CacheTags } from '@/lib/cache/UnifiedCache';

// ============= Types =============
export type Currency = 'EUR' | 'USD' | 'GBP' | 'MAD';

interface ExchangeRates {
  EUR: Record<Currency, number>;
  USD: Record<Currency, number>;
  GBP: Record<Currency, number>;
  MAD: Record<Currency, number>;
}

interface CurrencyState {
  // State
  currency: Currency;
  exchangeRates: ExchangeRates;
  isLoading: boolean;
  lastUpdated: number | null;
  
  // Actions
  setCurrency: (currency: Currency) => void;
  fetchExchangeRates: () => Promise<void>;
  refreshRates: () => Promise<void>;
  
  // Computed (as functions)
  convertPrice: (price: number, fromCurrency?: Currency) => number;
  formatPrice: (price: number, fromCurrency?: Currency) => string;
}

// ============= Constants =============
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

const RATES_CACHE_KEY = 'exchange_rates';

// ============= Store =============
export const useCurrencyStore = create<CurrencyState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currency: 'EUR',
        exchangeRates: DEFAULT_EXCHANGE_RATES,
        isLoading: false,
        lastUpdated: null,

        setCurrency: (currency) => {
          set({ currency });
          // Also persist to safeStorage for compatibility
          safeSetItem(StorageKeys.CURRENCY, currency, { ttl: StorageTTL.MONTH });
        },

        fetchExchangeRates: async () => {
          try {
            // Try cache first (with safety check)
            if (cache && typeof cache.get === 'function') {
              const cached = cache.get<ExchangeRates>(RATES_CACHE_KEY);
              if (cached?.data && !cached.isExpired) {
                set({ exchangeRates: cached.data, lastUpdated: Date.now() });
                return;
              }
            }

            set({ isLoading: true });

            // Use frankfurter.app - a free, open-source API with no key required
            const response = await fetch(
              'https://api.frankfurter.app/latest?from=EUR&to=USD,GBP'
            );

            if (!response.ok) {
              // Fall back to default rates silently
              set({ isLoading: false, lastUpdated: Date.now() });
              return;
            }

            const data = await response.json();
            
            // Frankfurter API returns { rates: { USD: x, GBP: y } }
            if (!data.rates) {
              set({ isLoading: false, lastUpdated: Date.now() });
              return;
            }

            const rates = {
              USD: data.rates.USD ?? DEFAULT_EXCHANGE_RATES.EUR.USD,
              GBP: data.rates.GBP ?? DEFAULT_EXCHANGE_RATES.EUR.GBP,
              MAD: DEFAULT_EXCHANGE_RATES.EUR.MAD // MAD not supported by frankfurter, use default
            };

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

            // Cache the new rates (with safety check)
            if (cache && typeof cache.set === 'function') {
              cache.set(RATES_CACHE_KEY, newRates, {
                ttl: CacheTTL.HOUR,
                staleTime: CacheTTL.MEDIUM,
                tags: [CacheTags.PROFILE]
              });
            }

            set({ exchangeRates: newRates, lastUpdated: Date.now(), isLoading: false });
          } catch (error) {
            // Silently fall back to default rates - no need to log as user-facing error
            set({ isLoading: false, lastUpdated: Date.now() });
          }
        },

        refreshRates: async () => {
          if (cache && typeof cache.invalidate === 'function') {
            cache.invalidate(RATES_CACHE_KEY);
          }
          await get().fetchExchangeRates();
        },

        convertPrice: (price, fromCurrency = 'EUR') => {
          const { currency, exchangeRates } = get();
          if (fromCurrency === currency) return price;
          const rate = exchangeRates[fromCurrency]?.[currency] ?? 1;
          return Math.round(price * rate * 100) / 100;
        },

        formatPrice: (price, fromCurrency = 'EUR') => {
          const { currency, convertPrice } = get();
          const convertedPrice = convertPrice(price, fromCurrency);

          try {
            return new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
              style: 'currency',
              currency: currency === 'MAD' ? 'MAD' : currency,
              minimumFractionDigits: currency === 'EUR' ? 0 : 2,
              maximumFractionDigits: 2,
            }).format(convertedPrice);
          } catch {
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
        }
      }),
      {
        name: 'currency-storage',
        partialize: (state) => ({ currency: state.currency })
      }
    ),
    { name: 'currency-store' }
  )
);

// ============= Selectors =============
export const selectCurrency = (state: CurrencyState) => state.currency;
export const selectIsLoading = (state: CurrencyState) => state.isLoading;
export const selectLastUpdated = (state: CurrencyState) => 
  state.lastUpdated ? new Date(state.lastUpdated) : null;

// ============= Hook for compatibility =============
export const useCurrency = () => {
  const currency = useCurrencyStore(selectCurrency);
  const isLoading = useCurrencyStore(selectIsLoading);
  const lastUpdated = useCurrencyStore(selectLastUpdated);
  const setCurrency = useCurrencyStore(state => state.setCurrency);
  const formatPrice = useCurrencyStore(state => state.formatPrice);
  const convertPrice = useCurrencyStore(state => state.convertPrice);
  const refreshRates = useCurrencyStore(state => state.refreshRates);

  return {
    currency,
    setCurrency,
    formatPrice,
    convertPrice,
    isLoading,
    lastUpdated,
    refreshRates
  };
};

// ============= Initialization =============
export const initializeCurrencyStore = () => {
  // Load persisted currency and fetch rates
  const saved = safeGetItem<Currency>(StorageKeys.CURRENCY);
  if (saved && ['EUR', 'USD', 'GBP', 'MAD'].includes(saved)) {
    useCurrencyStore.getState().setCurrency(saved);
  }
  useCurrencyStore.getState().fetchExchangeRates();
};
