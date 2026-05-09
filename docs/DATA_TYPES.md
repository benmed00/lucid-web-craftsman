# Data typing layers (SSOT → domain → boundaries → UI)

This document is the map for **canonical types** and **critical commerce flows**. Generated Postgres types remain the single source of truth for persisted rows; the SPA adds named aliases and Zod-validated Edge responses so runtime JSON matches intent.

## Search & indexes

| Resource                                        | Use                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [**TYPES_INDEX.md**](./TYPES_INDEX.md)          | Flat symbol tables (grep-friendly); maps exports → Postgres / contracts.                                                             |
| [**TYPEDOC.md**](./TYPEDOC.md)                  | Generate **searchable HTML** for domain + contracts + `order.types` (`pnpm run docs:typedoc` → `docs/generated/typedoc/index.html`). |
| [`src/types/README.md`](../src/types/README.md) | Entry point from the codebase.                                                                                                       |

## TypeScript compiler (`strict`)

`tsconfig.app.json` and the root `tsconfig.json` use **`strict: true`** (including `strictNullChecks`). Treat Supabase **`Row`** fields as **`T | null`** when columns are nullable; the storefront **`Product`** interface and several admin view models intentionally allow `| null` on optional fields so assignments from query results type-check without unsafe casts.

## Layer 1 — Generated database types

| Artifact                                                                      | Role                                                                                                       |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`src/integrations/supabase/types.ts`](../src/integrations/supabase/types.ts) | `Database`, `Json`, table `Row` / `Insert` / `Update`. Regenerate after migrations (`supabase gen types`). |

## Layer 2 — Domain aliases (`src/types/domain`)

Thin exports derived only from `Database` — use these instead of hand-written duplicates.

| Module                                           | Canonical aliases                                                                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`product.ts`](../src/types/domain/product.ts)   | `ProductRow`, `ProductInsert`, `ProductUpdate`                                                                                                                                                    |
| [`order.ts`](../src/types/domain/order.ts)       | `OrderRow`, `OrderItemRow`, `OrderInsert`, `OrderUpdate`, `OrderStatus`, `AnomalyType`, `AnomalySeverity`, `StatusChangeActor`, `AdminOrderPermission` (all Postgres enums — no duplicate unions) |
| [`checkout.ts`](../src/types/domain/checkout.ts) | `CheckoutSessionRow`, `CheckoutSessionInsert`, `CheckoutSessionUpdate`, `CheckoutCartItemsJson`                                                                                                   |
| [`profile.ts`](../src/types/domain/profile.ts)   | `ProfileRow`, …                                                                                                                                                                                   |

## Layer 3 — Legacy `shared/interfaces` vs tables

| Legacy interface                                                               | Supabase truth                                            | Notes                                                                                                                                                                                    |
| ------------------------------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`Product`](../src/shared/interfaces/Iproduct.interface.ts)                    | `ProductRow`                                              | **Persisted truth:** `ProductRow`. **`Product`** is a loose storefront/mock/view shape; use **`ProductRow`** when typing full DB rows. Deprecated camelCase aliases remain on `Product`. |
| [`BlogPost`](../src/shared/interfaces/IBlogPost.interface.ts)                  | [`blog_posts`](../src/integrations/supabase/types.ts) row | List/detail UI shape (numeric `id`, `image`, etc.) **does not** match `blog_posts` (`id` UUID, `featured_image_url`, …). Treat as **mock/API view model** until migrated.                |
| [`IinitialCartItems`](../src/shared/interfaces/IinitialCartItems.interface.ts) | —                                                         | Minimal cart line shape for fixtures; not a DB row.                                                                                                                                      |

## Critical flows → types & modules

| Flow                                          | Where data moves                                                                    | Canonical / boundary types                                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Cart → checkout session                       | `useCheckoutSession`, [`checkoutApi`](../src/services/checkoutApi.ts)               | `CheckoutSessionRow`, `CheckoutSessionInsert` / `Update`                                                                              |
| Create payment session                        | [`checkoutService`](../src/services/checkoutService.ts) → `invokeCreatePaymentEdge` | Edge body validated with [`parseCreatePaymentInvokeBody`](../src/types/contracts/edge-invoke-responses.ts); Stripe redirect `{ url }` |
| Legacy `/payment-success` → order id          | [`PaymentSuccess`](../src/pages/PaymentSuccess.tsx) → `invokeOrderLookup`           | [`OrderLookupResponse`](../src/types/contracts/edge-invoke-responses.ts) (`found` discriminant)                                       |
| Order lookup / Stripe session (other callers) | [`checkoutApi`](../src/services/checkoutApi.ts)                                     | Same parsers in [`src/types/contracts`](../src/types/contracts/)                                                                      |

OpenAPI bundle (human-oriented contract index): [`openapi/supabase-edge-functions.json`](../openapi/supabase-edge-functions.json). Detailed payloads are defined in Edge handlers (e.g. `supabase/functions/order-lookup/index.ts`, `stripe-session-display/index.ts`, `create-payment/index.ts`).

## Layer 4 — Zod at Edge boundaries

Unknown JSON from `functions.invoke` is parsed with **Zod** in [`src/types/contracts/edge-invoke-responses.ts`](../src/types/contracts/edge-invoke-responses.ts). [`checkoutApi`](../src/services/checkoutApi.ts) wraps invokes and returns typed `EdgeInvokeResult<T>` after parsing.

## `order.types.ts` vs `domain/order.ts`

[`src/types/order.types.ts`](../src/types/order.types.ts) keeps **composite / UI-heavy** shapes (`Order`, `CustomerOrderView`, `ORDER_STATUS_CONFIG`, …). All **enum literals and table row aliases** that mirror Postgres are re-exported from [`domain/order.ts`](../src/types/domain/order.ts) so they stay tied to `Database`. Prefer importing enums and `OrderRow` from `@/types/domain/order` in new code; importing from `@/types/order.types` remains valid.

## PR checklist (incremental)

- New persisted entity: derive from `Database['public']['Tables'][name]` (or add a **named view type** with `Pick` / `Omit`), do not copy a full duplicate interface.
- New Edge consumer: add or extend a schema in `src/types/contracts/` and parse `unknown` before use.
