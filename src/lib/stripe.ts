
// Stripe configuration for the frontend

export const STRIPE_PUBLIC_KEY = "pk_test_51OzdrzCnv9i5ZLAFKWzWGBrVXYOyK0WoVnGQXTvBW3T0GVXbsQ9L0EqkSahRD4cp9NPleEUP6T0tSgvH8lFwaPWF00QHiYTfMU";

export const formatPrice = (amount: number): string => {
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });
  
  return formatter.format(amount);
};
