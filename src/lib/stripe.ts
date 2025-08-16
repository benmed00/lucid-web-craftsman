
// Stripe configuration for the frontend

// SECURITY NOTE: In production, this should be loaded from environment variables
// For now using a constant - replace with your actual Stripe publishable key
const DEFAULT_STRIPE_PUBLIC_KEY = "pk_test_YOUR_TEST_KEY_HERE"; // Replace with your key

// Get Stripe public key - prioritize environment variable if available
export const STRIPE_PUBLIC_KEY = 
  (typeof window !== 'undefined' && (window as any).STRIPE_PUBLIC_KEY) || 
  DEFAULT_STRIPE_PUBLIC_KEY;

export const formatPrice = (amount: number): string => {
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });
  
  return formatter.format(amount);
};

// Initialize Stripe payment
export const initializeStripePayment = async (items: any[], customerInfo: any) => {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, customerInfo }),
    });
    
    const { url } = await response.json();
    return { url, success: true };
  } catch (error) {
    console.error("Error initializing payment:", error);
    return { success: false, error: "Payment initialization failed" };
  }
};
