// File_name : src/utils/currencyUtils.ts

import { DEFAULT_CURRENCY, CURRENCY_SYMBOLS, FREE_SHIPPING_THRESHOLD } from '../constants';

export type Currency = 'EUR' | 'USD' | 'GBP' | 'JPY' | 'CHF';

export type ShippingZone = 'EUROPE' | 'WORLDWIDE' | 'DOMINANT';

export interface CartItem {
  price: number;
  quantity: number;
}

export interface CartTotals {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
}

export const formatCurrency = (amount: number, currency: Currency = DEFAULT_CURRENCY): string => {
  if (isNaN(amount) || amount < 0) {
    throw new Error('Invalid amount');
  }
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatCurrencyWithSymbol = (amount: number, currency: Currency = DEFAULT_CURRENCY): string => {
  if (isNaN(amount) || amount < 0) {
    throw new Error('Invalid amount');
  }
  
  const symbol = CURRENCY_SYMBOLS[currency];
  if (!symbol) {
    throw new Error(`No symbol found for currency: ${currency}`);
  }
  
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
};

export const calculateSubtotal = (items: CartItem[]): number => {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }
  
  return items.reduce((total, item) => {
    if (isNaN(item.price) || isNaN(item.quantity) || item.quantity < 0) {
      throw new Error('Invalid item data');
    }
    return total + (item.price * item.quantity);
  }, 0);
};

export const calculateTax = (amount: number, rate: number = 20): number => {
  if (isNaN(amount) || amount < 0) {
    throw new Error('Invalid amount');
  }
  if (rate < 0 || rate > 100) {
    throw new Error('Tax rate must be between 0 and 100');
  }
  
  return (amount * rate) / 100;
};

export const calculateShipping = (
  subtotal: number,
  shippingZone: ShippingZone,
  freeShippingThreshold: number = FREE_SHIPPING_THRESHOLD
): number => {
  if (isNaN(subtotal) || subtotal < 0) {
    throw new Error('Invalid subtotal');
  }
  
  if (subtotal >= freeShippingThreshold) return 0;
  
  switch (shippingZone) {
    case 'EUROPE':
      return 10;
    case 'WORLDWIDE':
      return 20;
    case 'DOMINANT':
      return 15;
    default:
      throw new Error(`Unknown shipping zone: ${shippingZone}`);
  }
};

export const calculateTotal = (
  subtotal: number,
  tax: number,
  shipping: number,
  discount: number = 0
): number => {
  if (isNaN(subtotal) || subtotal < 0) {
    throw new Error('Invalid subtotal');
  }
  if (isNaN(tax) || tax < 0) {
    throw new Error('Invalid tax amount');
  }
  if (isNaN(shipping) || shipping < 0) {
    throw new Error('Invalid shipping amount');
  }
  if (isNaN(discount) || discount < 0) {
    throw new Error('Invalid discount amount');
  }
  
  const total = subtotal + tax + shipping - discount;
  if (total < 0) {
    throw new Error('Total cannot be negative');
  }
  
  return total;
};

export const calculateCartTotals = (items: CartItem[], shippingZone: ShippingZone): CartTotals => {
  const subtotal = calculateSubtotal(items);
  const tax = calculateTax(subtotal);
  const shipping = calculateShipping(subtotal, shippingZone);
  const total = calculateTotal(subtotal, tax, shipping);
  
  return {
    subtotal,
    tax,
    shipping,
    discount: 0,
    total
  };
};

export const applyDiscount = (totals: CartTotals, discount: number): CartTotals => {
  const newTotals = { ...totals };
  newTotals.discount = discount;
  newTotals.total = calculateTotal(
    totals.subtotal,
    totals.tax,
    totals.shipping,
    discount
  );
  
  return newTotals;
};
