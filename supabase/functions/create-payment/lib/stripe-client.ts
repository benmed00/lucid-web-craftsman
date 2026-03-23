import Stripe from 'stripe';

export function createCheckoutStripeClient(): Stripe {
  return new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2025-08-27.basil',
  });
}
