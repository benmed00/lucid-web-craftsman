// Stripe configuration for the frontend
// Uses centralized API client for consistent error handling

import { apiClient } from '@/lib/api/apiClient';
import { handleError, BusinessError } from '@/lib/errors/AppError';

// Types
export interface StripeCartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface StripeCustomerInfo {
  email: string;
  firstName: string;
  lastName: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

export interface StripePaymentResult {
  success: boolean;
  url?: string;
  error?: string;
  errorCode?: string;
}

// Extend Window interface for global Stripe key
declare global {
  interface Window {
    STRIPE_PUBLIC_KEY?: string;
  }
}

// SECURITY NOTE: In production, this should be loaded from environment variables
const DEFAULT_STRIPE_PUBLIC_KEY = 'pk_test_YOUR_TEST_KEY_HERE';

// Get Stripe public key - prioritize environment variable if available
export const STRIPE_PUBLIC_KEY =
  (typeof window !== 'undefined' && window.STRIPE_PUBLIC_KEY) ||
  DEFAULT_STRIPE_PUBLIC_KEY;

export const formatPrice = (amount: number): string => {
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });

  return formatter.format(amount);
};

// Validate cart items before payment
function validateCartItems(items: StripeCartItem[]): void {
  if (!items || items.length === 0) {
    throw new BusinessError('Le panier est vide', 'EMPTY_CART');
  }

  for (const item of items) {
    if (item.quantity <= 0) {
      throw new BusinessError(
        `Quantité invalide pour ${item.name}`,
        'INVALID_QUANTITY',
        { productId: item.id }
      );
    }
    if (item.price <= 0) {
      throw new BusinessError(
        `Prix invalide pour ${item.name}`,
        'INVALID_PRICE',
        { productId: item.id }
      );
    }
  }
}

// Validate customer info
function validateCustomerInfo(customerInfo: StripeCustomerInfo): void {
  if (!customerInfo.email || !customerInfo.email.includes('@')) {
    throw new BusinessError('Email invalide', 'INVALID_EMAIL');
  }
  if (!customerInfo.firstName?.trim()) {
    throw new BusinessError('Prénom requis', 'MISSING_FIRST_NAME');
  }
  if (!customerInfo.lastName?.trim()) {
    throw new BusinessError('Nom requis', 'MISSING_LAST_NAME');
  }
}

// Initialize Stripe payment
export const initializeStripePayment = async (
  items: StripeCartItem[],
  customerInfo: StripeCustomerInfo
): Promise<StripePaymentResult> => {
  try {
    // Validate inputs before API call
    validateCartItems(items);
    validateCustomerInfo(customerInfo);

    // Use centralized API client for consistent error handling
    const data = await apiClient.post<{ url: string; sessionId?: string }>(
      '/api/create-checkout-session',
      { items, customerInfo }
    );

    if (!data.url) {
      throw new BusinessError(
        'URL de paiement non reçue',
        'MISSING_CHECKOUT_URL'
      );
    }

    return { url: data.url, success: true };
  } catch (error) {
    const appError = handleError(error);

    console.error('Payment initialization failed:', {
      code: appError.code,
      message: appError.message,
      context: appError.context,
    });

    return {
      success: false,
      error: appError.message,
      errorCode: appError.code,
    };
  }
};

// Verify payment status
export const verifyPaymentStatus = async (
  sessionId: string
): Promise<{ status: 'success' | 'pending' | 'failed'; orderId?: string }> => {
  try {
    const data = await apiClient.get<{
      status: 'success' | 'pending' | 'failed';
      orderId?: string;
    }>(`/api/verify-payment?session_id=${encodeURIComponent(sessionId)}`);

    return data;
  } catch (error) {
    const appError = handleError(error);
    console.error('Payment verification failed:', appError.message);
    return { status: 'failed' };
  }
};
