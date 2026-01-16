// Stripe configuration for the frontend

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
}

// Extend Window interface for global Stripe key
declare global {
  interface Window {
    STRIPE_PUBLIC_KEY?: string;
  }
}

// SECURITY NOTE: In production, this should be loaded from environment variables
const DEFAULT_STRIPE_PUBLIC_KEY = "pk_test_YOUR_TEST_KEY_HERE";

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

// Initialize Stripe payment
export const initializeStripePayment = async (
  items: StripeCartItem[],
  customerInfo: StripeCustomerInfo
): Promise<StripePaymentResult> => {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, customerInfo }),
    });

    const data = await response.json();
    return { url: data.url, success: true };
  } catch (error) {
    console.error('Error initializing payment:', error);
    return { success: false, error: 'Payment initialization failed' };
  }
};
