
// Stripe configuration for the frontend

export const STRIPE_PUBLIC_KEY = "pk_test_51OzdrzCnv9i5ZLAFKWzWGBrVXYOyK0WoVnGQXTvBW3T0GVXbsQ9L0EqkSahRD4cp9NPleEUP6T0tSgvH8lFwaPWF00QHiYTfMU";

export const formatPrice = (amount: number): string => {
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });
  
  return formatter.format(amount);
};

// Initialize Stripe payment
export const initializeStripePayment = async (items, customerEmail) => {
  try {
    // In a real app, this would make an API call to your backend
    // For this mock implementation, we'll simulate a successful checkout URL
    return {
      url: '/checkout',
      success: true
    };
    
    // Real implementation would look like this:
    /*
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, customerEmail }),
    });
    
    const { url } = await response.json();
    return { url, success: true };
    */
  } catch (error) {
    console.error("Error initializing payment:", error);
    return { success: false, error: "Payment initialization failed" };
  }
};
