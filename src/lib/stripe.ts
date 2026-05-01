// Stripe-related helpers for the storefront UI (public key, formatting).
// Checkout sessions are created via the `create-payment` Edge Function (`checkoutService`), not `/api`.

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
