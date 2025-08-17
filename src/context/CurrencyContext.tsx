import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Currency = 'EUR' | 'USD' | 'GBP';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (price: number) => string;
  convertPrice: (price: number, fromCurrency?: Currency) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Exchange rates (in production, these should be fetched from an API)
const EXCHANGE_RATES: Record<Currency, Record<Currency, number>> = {
  EUR: { EUR: 1, USD: 1.09, GBP: 0.86 },
  USD: { EUR: 0.92, USD: 1, GBP: 0.79 },
  GBP: { EUR: 1.16, USD: 1.27, GBP: 1 }
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£'
};

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>('EUR');

  const convertPrice = (price: number, fromCurrency: Currency = 'EUR'): number => {
    if (fromCurrency === currency) return price;
    return Math.round(price * EXCHANGE_RATES[fromCurrency][currency] * 100) / 100;
  };

  const formatPrice = (price: number): string => {
    const convertedPrice = convertPrice(price);
    const symbol = CURRENCY_SYMBOLS[currency];
    
    // Format based on currency conventions
    switch (currency) {
      case 'USD':
        return `${symbol}${convertedPrice.toFixed(2)}`;
      case 'GBP':
        return `${symbol}${convertedPrice.toFixed(2)}`;
      case 'EUR':
      default:
        return `${convertedPrice.toFixed(0)} ${symbol}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, convertPrice }}>
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