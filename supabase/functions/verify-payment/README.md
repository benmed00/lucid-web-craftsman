# verify-payment (Edge Function)

## Current role

The **storefront SPA does not call this function** for Stripe return handling. After checkout, the client uses:

- **`order-lookup`** — DB lookup by `session_id` (with polling while the webhook finalizes).
- **`stripe-session-display`** — read-only Stripe session + line items for UX when the order row is not ready yet.

`verify-payment` remains deployed for:

- **Backward compatibility** if any old client, script, or integration still invokes it.
- **Optional integration tests** (`src/tests/edge-functions.test.ts` against a real Supabase project).

## Source of truth

Payment and order state are finalized by **`stripe-webhook`** (and related DB updates). This function must stay **read-only** with respect to mutating order payment state; see comments in `index.ts`.

## Related documentation

- Storefront **post-checkout** flow (order-lookup, webhooks, isolation): [`docs/PLATFORM.md`](../../../docs/PLATFORM.md) (repo root).

## Deprecation path

Before removing the function from `supabase/config.toml` and deleting the folder:

1. Confirm no production callers (logs, API gateway, mobile apps).
2. Remove or replace the `describe('verify-payment')` block in `edge-functions.test.ts` if you drop the endpoint.
