
// Stripe configuration for the frontend

// Live Stripe public key (safe for client-side use)
export const STRIPE_PUBLIC_KEY = "pk_live_51JcgE4IoTolWHboBY8dZF4BDQdpQ3y1wpeLkui305ZFPSKePiTJxTRVacksDIm8XHCYbzbWJH6opa8Aoxbktq0Rp00sOSRTCK1";

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
