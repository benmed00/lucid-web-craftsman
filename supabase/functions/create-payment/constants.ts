/** Thrown parse errors use this prefix so `isClientFacingValidationError` maps them to HTTP 422. */
export const CHECKOUT_VALIDATION_ERROR_PREFIX: string =
  'Invalid checkout request:';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-csrf-token, x-csrf-nonce, x-csrf-hash, x-guest-id, x-checkout-session-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const RATE_LIMIT_WINDOW_MS: number = 5 * 60 * 1000;
export const MAX_PAYMENT_ATTEMPTS: number = 3;

/** Max line items accepted per checkout request */
export const MAX_CART_ITEMS: number = 50;

/** Stripe minimum charge (€0.50) in cents — discount cap logic */
export const STRIPE_MINIMUM_CENTS: number = 50;

/** Standard shipping line item for Checkout (EUR cents) */
export const SHIPPING_COST_CENTS: number = 695;

let productionOriginCache: string | null = null;

/**
 * Canonical site origin (no trailing slash). Reads `SITE_URL` on first use only
 * so importing this module in tests does not require `--allow-env`.
 */
export function resolveProductionOrigin(): string {
  if (productionOriginCache === null) {
    productionOriginCache = (
      Deno.env.get('SITE_URL') || 'https://www.rifelegance.com'
    ).replace(/\/+$/, '');
  }
  return productionOriginCache;
}

/** Origin allowlist reserved for future strict redirect validation */
export const _ALLOWED_ORIGINS: string[] = [
  'https://www.rifelegance.com',
  'https://rifelegance.com',
  'https://rif-raw-straw.lovable.app',
  'https://id-preview--1ed5c182-2490-4180-9969-ca6a7e19e8ca.lovable.app',
];

export const getValidOrigin: (_req: Request) => string = (_req) => {
  return resolveProductionOrigin();
};
