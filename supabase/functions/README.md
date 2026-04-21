# Supabase Edge Functions

Source for deployed Edge Functions lives in subdirectories here. Parent folder (migrations, `config.toml`): [`../README.md`](../README.md).

**Project documentation:** [Documentation index](../../docs/README.md) · [Platform behavior](../../docs/PLATFORM.md) (checkout return, webhooks, storefront isolation).

## Documented functions

| Function           | Notes                                                                                                                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **create-payment** | [DATA_FLOW.md](./create-payment/DATA_FLOW.md), [REFACTOR_PLAN.md](./create-payment/REFACTOR_PLAN.md), [constants.ts](./create-payment/constants.ts) (CORS, limits, origins). Local verify: `npm run verify:create-payment` (repo root, Deno + frozen lockfile). |
| **order-lookup**   | Read-only order status for post-checkout UI. UUID helper tests: `cd supabase/functions && deno test order-lookup/lib/order_uuid_test.ts` (uses root `deno.json` import map).                                                                                    |
| **verify-payment** | [README](./verify-payment/README.md) — not used by the SPA for the primary Stripe success path; kept for compatibility and optional tests.                                                                                                                      |
| **get-order-by-token** | [README](./get-order-by-token/README.md) — token-gated read (order + items) for the `/order-confirmation` page. Uses `INVOICE_SIGNING_SECRET` (paired with `sign-order-token`); PII-whitelisted `metadata`. 28 deno tests: `deno test --config supabase/functions/deno.json --allow-env supabase/functions/get-order-by-token/index_test.ts`. |

Other folders under `supabase/functions/` follow the same deploy layout; optional OpenAPI fragments: `openapi.fragment.json` per function.

## HTTP contracts & collections

- **OpenAPI (bundled):** [`openapi/supabase-edge-functions.json`](../../openapi/supabase-edge-functions.json) — `npm run openapi:edge-functions` · drift: `openapi:edge-functions:check`
- **Postman:** [`postman/`](../../postman/) — `npm run postman:collection` · drift: `postman:collection:check`
- **Both:** `npm run api:artifacts`

Details: [STANDARDS.md — API artifacts](../../docs/STANDARDS.md).

## Deploy configuration

- [`../config.toml`](../config.toml) — function entries, `verify_jwt`, secrets wiring.
