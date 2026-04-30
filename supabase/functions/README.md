# Supabase Edge Functions

Source for deployed Edge Functions lives in subdirectories here. Parent folder (migrations, `config.toml`): [`../README.md`](../README.md).

**Project documentation:** [Documentation index](../../docs/README.md) · [Platform behavior](../../docs/PLATFORM.md) (checkout return, webhooks, storefront isolation).

## Documented functions

| Function               | Notes                                                                                                                                                                                                                                                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **create-payment**     | [DATA_FLOW.md](./create-payment/DATA_FLOW.md), [REFACTOR_PLAN.md](./create-payment/REFACTOR_PLAN.md), [constants.ts](./create-payment/constants.ts) (CORS, limits, origins). Local verify: `pnpm run verify:create-payment` (repo root, Deno + frozen lockfile).                                                                               |
| **order-lookup**       | Read-only order status for post-checkout UI. UUID helper tests: `cd supabase/functions && deno test order-lookup/lib/order_uuid_test.ts` (uses root `deno.json` import map).                                                                                                                                                                  |
| **verify-payment**     | [README](./verify-payment/README.md) — not used by the SPA for the primary Stripe success path; kept for compatibility and optional tests.                                                                                                                                                                                                    |
| **get-order-by-token** | [README](./get-order-by-token/README.md) — token-gated read (order + items) for the `/order-confirmation` page. Uses `INVOICE_SIGNING_SECRET` (paired with `sign-order-token`); PII-whitelisted `metadata`. 28 deno tests: `deno test --config supabase/functions/deno.json --allow-env supabase/functions/get-order-by-token/index_test.ts`. |

Other folders under `supabase/functions/` follow the same deploy layout; optional OpenAPI fragments: `openapi.fragment.json` per function.

## Test & CI inventory

**GitHub workflow [`deno-create-payment.yml`](../../.github/workflows/deno-create-payment.yml)** (Deno 2):

| Area                         | Commands in workflow                                                                                                                                                                                                                | Notes                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **create-payment**           | `deno check` / `deno lint` / `deno test` under `supabase/functions/create-payment/`                                                                                                                                                 | Primary payment entrypoint tests (`lib/**/*_test.ts`, `constants_test.ts`).                             |
| **create-admin-user**        | `deno check` / `deno lint` / `deno test` on `handler_test.ts`                                                                                                                                                                       | Privileged admin user creation.                                                                         |
| **Pricing helpers (shared)** | Single step: `_shared/pricing_snapshot_*`, `_shared/persist-pricing-snapshot_test.ts`, `_shared/confirm-order_test.ts`, `stripe-webhook/lib/pricing-snapshot_test.ts`, `send-order-confirmation/_lib/email-pricing-from-db_test.ts` | Mirrors [`pnpm run test:pricing-snapshot`](../../package.json); same bundles as SPA snapshot discipline. |

**Other functions** with Deno tests you can run locally (not all are in the workflow above):

| Function                      | Tests (examples)                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| **get-order-by-token**        | `deno test … get-order-by-token/index_test.ts` — see folder [README](./get-order-by-token/README.md). |
| **monitor-payment-events**    | `handler_test.ts`                                                                                     |
| **order-confirmation-lookup** | `handler_test.ts`, `resolve_display_total_test.ts`                                                    |
| **order-lookup**              | `lib/order_uuid_test.ts`                                                                              |

Email/cron/integration surfaces (`send-*`, `carrier-webhook`, `cleanup-pending-orders`, `generate-sitemap`, PayPal helpers, …) may have **no** colocated `_test.ts` yet; rely on **bundling** (`check:edge-functions:bundling`), OpenAPI/Postman drift, and manual deploy discipline until tests are added per function ([`docs/TECH_DEBT.md`](../../docs/TECH_DEBT.md)).

## Shared contracts

- **`orders.amount`** column is legacy (checkout-time minors); **`orders.total_amount`** + **`pricing_snapshot`** are authoritative after Stripe persists pricing (`confirmOrderFromStripe` calls `_shared/persist-pricing-snapshot.ts` when `stripe` + `session` are provided).
- **Pricing snapshot (`orders.pricing_snapshot`):** [`_shared/PRICING_SNAPSHOT.md`](./_shared/PRICING_SNAPSHOT.md) — v1 schema, invariants, and versioning rules. Read this before changing `_shared/pricing-snapshot.ts` or `_shared/persist-pricing-snapshot.ts`. Tests: `pnpm run test:pricing-snapshot`.

## HTTP contracts & collections

- **OpenAPI (bundled):** [`openapi/supabase-edge-functions.json`](../../openapi/supabase-edge-functions.json) — `pnpm run openapi:edge-functions` · drift: `openapi:edge-functions:check`
- **Postman:** [`postman/`](../../postman/) — `pnpm run postman:collection` · drift: `postman:collection:check`
- **Both:** `pnpm run api:artifacts`

Details: [STANDARDS.md — API artifacts](../../docs/STANDARDS.md).

## Deploy configuration

- [`../config.toml`](../config.toml) — function entries, `verify_jwt`, secrets wiring.
