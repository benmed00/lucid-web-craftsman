// File_name : src/types/cartTypes.ts

import type { CountryCode, Address } from './commonTypes';
import type { Product } from './productTypes';
import type { User } from './userTypes';

export type CartStatus = 'active' | 'completed' | 'abandoned' | 'checkout';

export interface CartShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  deliveryTime: {
    min: number;
    max: number;
    unit: 'days' | 'weeks' | 'hours';
  };
  countries: CountryCode[];
}

export interface CartPaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  supportedCountries: CountryCode[];
  minAmount: number;
  maxAmount: number;
}

export interface CartCoupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minPurchase: number;
  maxDiscount: number;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image: string;
  size?: string;
  color?: string;
  options?: Record<string, string>;
}

export interface Cart {
  id: string;
  userId: string;
  status: CartStatus;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress?: Address;
  billingAddress?: Address;
  shippingMethod?: CartShippingMethod;
  paymentMethod?: CartPaymentMethod;
  coupon?: CartCoupon;
  discount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface CartActions {
  addItem: (cartId: string, productId: string, variantId: string, quantity: number) => Promise<Cart>;
  updateItem: (cartId: string, itemId: string, quantity: number) => Promise<Cart>;
  removeItem: (cartId: string, itemId: string) => Promise<Cart>;
  updateAddress: (cartId: string, addressType: 'shipping' | 'billing', address: Address) => Promise<Cart>;
  applyCoupon: (cartId: string, couponCode: string) => Promise<Cart>;
  removeCoupon: (cartId: string) => Promise<Cart>;
  selectShippingMethod: (cartId: string, shippingMethodId: string) => Promise<Cart>;
  selectPaymentMethod: (cartId: string, paymentMethodId: string) => Promise<Cart>;
  checkout: (cartId: string) => Promise<void>;
  clear: (cartId: string) => Promise<void>;
}
