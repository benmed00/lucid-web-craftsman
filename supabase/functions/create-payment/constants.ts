/**
 * @file constants.ts
 * @module supabase/functions/create-payment/constants
 *
 * Shared configuration for the **create-payment** Edge Function: CORS headers,
 * rate-limit knobs, cart/shipping/Stripe cent constants, checkout validation
 * error prefix (422 mapping), and **request-origin allowlisting** for Stripe
 * success/cancel URLs (`getValidOrigin`, `resolveProductionOrigin`).
 *
 * ## Documentation (read these when changing values here)
 *
 * | Doc | Why |
 * | --- | --- |
 * | [`./DATA_FLOW.md`](./DATA_FLOW.md) | HTTP/error layers; how validation prefix maps to 422 |
 * | [`./REFACTOR_PLAN.md`](./REFACTOR_PLAN.md) | Module map, phased refactors touching this file |
 * | [`../README.md`](../README.md) | Edge Functions index, OpenAPI/Postman, deploy notes |
 * | [`../../../docs/README.md`](../../../docs/README.md) | Repo doc index |
 * | [`../../../docs/PLATFORM.md`](../../../docs/PLATFORM.md) | SPA checkout/payment return, client ↔ Edge boundaries |
 * | [`../../../docs/STANDARDS.md`](../../../docs/STANDARDS.md) | `verify:create-payment`, API artifacts |
 * | [`../../../AGENTS.md`](../../../AGENTS.md) | Agent runbook: Deno verify commands |
 *
 * ## Related source (imports this module)
 *
 * `index.ts`, `lib/security.ts`, `lib/rate-limit.ts`, `lib/stripe-session.ts`, tests under `lib/*_test.ts`.
 *
 * ## SPA checkout UI (separate stack)
 *
 * Browser step-1 form: [`../../../src/components/checkout/CustomerInfoStep.tsx`](../../../src/components/checkout/CustomerInfoStep.tsx) — documented in file header; calls Edge only via shared services, not from this file.
 */

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

/** Known production / preview origins for Stripe success/cancel URLs. */
export const _ALLOWED_ORIGINS: string[] = [
  'https://www.rifelegance.com',
  'https://rifelegance.com',
  'https://rif-raw-straw.lovable.app',
  'https://id-preview--1ed5c182-2490-4180-9969-ca6a7e19e8ca.lovable.app',
];

function normalizeRequestOrigin(req: Request): string | null {
  const raw: string | undefined =
    req.headers.get('Origin')?.trim() || req.headers.get('Referer')?.trim();
  if (!raw) return null;
  try {
    const u: URL = new URL(raw);
    return `${u.protocol}//${u.host}`.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/** Local dev only: http on localhost / loopback so Stripe return stays on the same host as checkout. */
function isLocalDevOrigin(origin: string): boolean {
  try {
    const u: URL = new URL(origin);
    if (u.protocol !== 'http:') return false;
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Base URL for Stripe `success_url` / `cancel_url` and image prefixes.
 * Uses the request Origin (or Referer) when it matches the allowlist or local dev;
 * otherwise falls back to `SITE_URL` / production default.
 */
export function getValidOrigin(req: Request): string {
  const candidate: string | null = normalizeRequestOrigin(req);
  if (
    candidate !== null &&
    (_ALLOWED_ORIGINS.includes(candidate) || isLocalDevOrigin(candidate))
  ) {
    return candidate;
  }
  return resolveProductionOrigin();
}
