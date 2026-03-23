# Supabase Edge Functions

Source for deployed Edge Functions lives in subdirectories here. Parent folder (migrations, `config.toml`): [`../README.md`](../README.md).

**Project documentation:** [Documentation index](../../docs/README.md) · [Platform behavior](../../docs/PLATFORM.md) (checkout return, webhooks, storefront isolation).

## Documented functions

| Function           | Notes                                                                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **create-payment** | [DATA_FLOW.md](./create-payment/DATA_FLOW.md), [REFACTOR_PLAN.md](./create-payment/REFACTOR_PLAN.md). Local verify: `npm run verify:create-payment` (repo root, Deno + frozen lockfile). |
| **verify-payment** | [README](./verify-payment/README.md) — not used by the SPA for the primary Stripe success path; kept for compatibility and optional tests.                                               |

Other folders under `supabase/functions/` follow the same deploy layout; optional OpenAPI fragments: `openapi.fragment.json` per function.

## HTTP contracts & collections

- **OpenAPI (bundled):** [`openapi/supabase-edge-functions.json`](../../openapi/supabase-edge-functions.json) — `npm run openapi:edge-functions` · drift: `openapi:edge-functions:check`
- **Postman:** [`postman/`](../../postman/) — `npm run postman:collection` · drift: `postman:collection:check`
- **Both:** `npm run api:artifacts`

Details: [STANDARDS.md — API artifacts](../../docs/STANDARDS.md).

## Deploy configuration

- [`../config.toml`](../config.toml) — function entries, `verify_jwt`, secrets wiring.
