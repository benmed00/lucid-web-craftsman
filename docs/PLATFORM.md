# Platform behavior

This document describes how the application is structured and how **checkout, payments, and storefront sessions** behave. It replaces separate architecture and payment-isolation notes with one maintained source of truth.

## Runtime layout

| Layer                                | Role                                                                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vite SPA** (`src/`)                | React 18, React Router, TanStack Query, Tailwind + shadcn-style UI.                                                                                  |
| **Mock API** (`backend/`, port 3001) | Dev/staging: Express + json-server for products, posts, cart, orders. Vite proxies `/api` and `/health`.                                             |
| **Supabase**                         | Auth, Postgres (RLS), Realtime, Storage, Edge Functions. Client: `src/integrations/supabase/client.ts` (env vars with safe fallbacks for local use). |
| **Stripe**                           | Checkout Sessions; webhooks update `orders` / `payments` on the server.                                                                              |

**Dev contract:** Vite uses **port 8080** with `strictPort: true` so Cypress and `start-server-and-test` always hit the same origin. See [AGENTS.md](../AGENTS.md) and [cypress/README.md](../cypress/README.md).

## Source tree (high level)

```
src/
├── components/     # UI, layout, checkout, admin, profile, reviews, …
├── pages/          # Route-level screens (including admin under pages/admin)
├── hooks/          # Feature hooks (checkout, cart sync, wishlist, …)
├── context/        # Auth and cross-cutting providers
├── services/       # API modules (REST/Supabase-shaped calls, edge invocations)
├── lib/            # Storage guards, checkout keys, cart policy, errors, query client, …
├── stores/         # Zustand: cart, currency, theme, language (wishlist init bridges from hooks)
└── config/         # app.config (CSP, endpoints), button IDs for tests
```

### State and data

- **Cart:** `src/stores/cartStore.ts` + `useCartSync` — persisted; sync with Supabase depends on policy (below). Authenticated line sync to Postgres goes through **`cartSyncService.persistUserCartLinesViaRpc`** (single invalidate path for server cart query keys).
- **Wishlist:** `src/hooks/useWishlist.ts` (cloud + local paths; elevated users stay local-only). Cloud list uses TanStack Query; mutations update cache via **`setQueryData`**; Realtime still invalidates on server events.
- **Checkout / payment return:** `checkoutApi.ts`, `checkoutService.ts`, and hooks such as `useCheckoutSession` — no duplicate elevated `checkout_sessions` behavior; see **Storefront vs admin isolation** below.
- **Remote data:** Prefer TanStack Query with keys from `src/lib/checkout/queryKeys.ts` and shared `queryClient` where applicable.
- **Errors:** Typed helpers under `src/lib/errors/`; async code can use `trySafe`-style patterns documented in code.

### API usage

- Browser calls **Supabase client** (PostgREST, auth, realtime) and **invokes Edge Functions** for payment and order lookup flows.
- **Do not** put service role keys in the SPA; frontend uses `VITE_SUPABASE_PUBLISHABLE_KEY` only.

### Client API layer

All reusable **backend access** from the SPA should go through **`src/services/`** so pages and components stay thin.

| Pattern                                                         | Role                                                                         |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **`admin*Api.ts`, `authApi.ts`, `*Api.ts`**                     | Supabase queries/RPC/storage/Edge `invoke` for a feature or admin area.      |
| **`supabaseFunctionsApi.ts`**                                   | Shared `functions.invoke` helper and named wrappers (e.g. `translate-tag`).  |
| **`api.ts`**, **`apiClient`**                                   | Mock **`/api/*`**: Vite proxies to json-server (dev catalog/blog, etc.).     |
| **`checkoutApi.ts` / `checkoutService.ts` / `orderService.ts`** | Checkout and orders: Edge Functions, session display, and related PostgREST. |

**Admin dashboard:** Modules such as `adminOrdersApi.ts` run with the **logged-in user’s JWT**; access is enforced by **RLS** plus **`ProtectedAdminRoute`**. Never add a service-role key in this folder. Prefer **`admin*Api.ts`** for new dashboard data access; pair with `useQuery` / `useMutation` in hooks under `src/hooks/` or colocated admin hooks.

**Realtime:** Channel topic strings are client-scoped identifiers; use a stable **`lwc-`** prefix per feature (e.g. `lwc-wishlist-<userId>` in `wishlistApi.ts`) so names stay unique and grep-friendly. Always remove channels in hook cleanup (`removeChannel` / API helper).

**Adding a feature:** Prefer a new or extended module under `src/services/` and call it from hooks or TanStack Query, rather than scattering `supabase.from(...)` in UI files. ESLint **`no-restricted-imports`** blocks `@/integrations/supabase/client` under `src/pages/**` and `src/components/**` (tests excluded).

Folder readme: [`src/services/README.md`](../src/services/README.md).

### Configuration and security headers

- CSP and service URLs: `src/config/app.config.ts` (source of truth), aligned with `public/_headers` and `index.html` meta fallback when you add new origins.

## Checkout and payment return

**Trust model:** Stripe webhooks are the **source of truth** for payment state. The UI after redirect is read-oriented.

```text
User pays (Stripe Checkout)
  → stripe-webhook (Edge) updates Supabase orders / payments
  → Browser: order-lookup (canonical `order_id` in JSON body; legacy `session_id` = cs_* still supported)
  → PaymentSuccess on `/order-confirmation` (DB + optional pricing_snapshot; no verify-payment on the main path)
```

- **Stripe return URL** (from `create-payment`): `/order-confirmation?order_id=<orders.id>&payment_complete=1` — set in `lib/stripe-session.ts` after the pending order row exists. **`getValidOrigin`** / `SITE_URL` choose the storefront origin for that URL.
- **order-lookup** (primary): body **`{ order_id }`** (UUID). Authorization = **internal service role**, or **same `user_id`**, or **`x-guest-id` matching `orders.metadata.guest_id`**. Legacy body **`{ session_id: "cs_..." }`** still authorizes via stored Stripe session id + same guest/owner rules so a mismatched Supabase session does not block the buyer.
- **verify-payment** may remain deployed for compatibility or tests; the SPA does not call it for the primary Stripe success path. See `supabase/functions/verify-payment/README.md`.
- **Checkout UI (step 1):** [`src/components/checkout/CustomerInfoStep.tsx`](../src/components/checkout/CustomerInfoStep.tsx) — customer form; file header links back to this doc and E2E notes.
- **create-payment (Edge) config:** [`supabase/functions/create-payment/constants.ts`](../supabase/functions/create-payment/constants.ts) — CORS, limits, Stripe return URLs; links to [`DATA_FLOW.md`](../supabase/functions/create-payment/DATA_FLOW.md) and repo doc index in its header.

### Order confirmation data path

- **`/order-confirmation`** loads order data only via **`sign-order-token`** then **`get-order-by-token`** (no browser `rest/v1/orders` or `order_items` on that surface). Legacy **`/payment-success?session_id=`** may call **`order-lookup`** once to resolve `order_id`, then redirects into that token flow.
- **`sign-order-token`** may return **409** while the row is not paid yet; the client retries **at most twice** (three attempts total) only for that status.
- **stripe-webhook** retries transient DB/PostgREST failures for critical writes (see function env: `WEBHOOK_DB_RETRY_*`, optional `WEBHOOK_TIMING_LOG`).
- **`orders.total_amount`** / **`pricing_snapshot`** hold authoritative minor-unit totals after payment; legacy **`orders.amount`** remains for backward compatibility. The SPA uses **`fallbackTotalMinorFromOrder`** ([`src/lib/checkout/pricingSnapshot.ts`](../src/lib/checkout/pricingSnapshot.ts)) when v1 snapshot is absent.

**Legacy `amount` units (do not assume `amount * 100`):** older planning docs sometimes modeled legacy totals as “major units × 100”. In this repo, Stripe-era **`orders.amount`** is stored in **minor units (cents)** at checkout write-time (see [`DATA_FLOW.md`](../supabase/functions/create-payment/DATA_FLOW.md)); **`authoritativeTotalMinor`** / **`fallbackTotalMinorFromOrder`** implement the read-side ladder. SQL backfill for **`total_amount`** is unit-aware ([`20260324183000_order_pricing_snapshot.sql`](../supabase/migrations/20260324183000_order_pricing_snapshot.sql)).

### Service worker

- `public/sw.js` bypasses sensitive navigations (e.g. `/order-confirmation`, `/invoice`, `/checkout`) and **does not cache hashed `/assets/*.js`** so payment and confirmation code cannot go stale behind the SW. Boot still unregisters SW in `main.tsx` until a versioned strategy is adopted.

## Storefront vs admin isolation

**Problem:** An admin can be logged into the dashboard and browse the shop in the same browser. Without isolation, cart, wishlist, checkout draft, and `checkout_sessions` could mix with customer data.

**Approach:** `resolveCartSyncPolicy(userId)` (see `src/lib/cart/cartSyncPolicy.ts`) calls `is_admin_user`, caches per user in `sessionStorage`, and treats **elevated** admins on the storefront specially:

| Concern                  | Standard customer / guest | Elevated (admin on storefront)                                             |
| ------------------------ | ------------------------- | -------------------------------------------------------------------------- |
| Cart persist bucket      | `cart-storage`            | `cart-storage-elevated`                                                    |
| Supabase cart sync       | Allowed when logged in    | **Disabled** (`sync_cart` not used)                                        |
| Wishlist                 | Cloud + realtime          | Local key `wishlist-elevated-ids:<userId>` only                            |
| Checkout local keys      | Normal suffix             | Separate elevated keys via `getCheckoutStorageKeys`                        |
| `checkout_sessions` rows | Created/updated as today  | **Not** read or written; checkout session state is in-memory for that mode |

Hooks involved: `useCartSync`, `useCheckoutFormPersistence`, `useCheckoutResume`, `useCheckoutSession`, and `AuthContext` cleanup (including `clearCheckoutContextState`). Storage allowlisting: `src/lib/storage/safeStorage.ts`, `StorageGuard.ts`.

**Tests:** `src/lib/cart/cartSyncPolicy.test.ts`, `src/lib/checkout/checkoutStorageKeys.test.ts`, `src/lib/invoice/generateInvoice.requestOrderToken.test.ts`, `src/lib/security/forbiddenOrderRestFetchGuard.test.ts`; E2E: `cypress/e2e/elevated_storefront_spec.ts` (requires `ADMIN_*` or `CUSTOMER_*` in `cypress.env.json`).

## Known residual risks (honest)

- Webhook slower than UI poll budget → mitigated by **`processing`** state, React Query refetch, and email/support CTAs (no Stripe session display on the default success path).
- Full formal proof of cross-tab/session isolation is not automated beyond policy + E2E spot checks.
- No internal dead-letter queue for webhooks; Stripe retries on 5xx.

For **automated route coverage**, see [E2E-COVERAGE.md](./E2E-COVERAGE.md).

## Route inventory

**Source of truth:** [`src/App.tsx`](../src/App.tsx) (`<Routes>`). Update this section when you add or rename routes.

**Maintenance mode:** When enabled, storefront routes render the maintenance page except paths under `/admin/*` (admins can still sign in and work).

| Path                                  | Notes                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `/`                                   | Home (`Index`), eager-loaded                                                |
| `/products`                           | Product listing                                                             |
| `/products/:id`                       | Product detail                                                              |
| `/shop`                               | Redirect → `/products`                                                      |
| `/auth`                               | Login, signup, OTP                                                          |
| `/profile`, `/enhanced-profile`       | Same profile UI                                                             |
| `/orders`                             | Order history                                                               |
| `/cart`                               | Cart                                                                        |
| `/checkout`                           | Multi-step checkout                                                         |
| `/payment-success`                    | **Redirect** → `/order-confirmation` (query preserved) — legacy return URLs |
| `/order-confirmation`                 | Post-payment entry / resolver                                               |
| `/order-confirmation/:orderReference` | Order confirmation detail                                                   |
| `/compare`                            | Product compare                                                             |
| `/wishlist`                           | Wishlist                                                                    |
| `/blog`, `/blog/:id`                  | Blog list and post                                                          |
| `/contact`                            | Contact                                                                     |
| `/shipping`, `/returns`, `/faq`       | Policies / help                                                             |
| `/about`, `/story`                    | Content pages                                                               |
| `/terms`, `/cgv`, `/terms-of-service` | Legal                                                                       |
| `/unsubscribe`                        | Newsletter unsubscribe                                                      |
| `*`                                   | `NotFound`                                                                  |

### Admin (`/admin`)

| Path                     | Purpose                                                   |
| ------------------------ | --------------------------------------------------------- |
| `/admin/login`           | Admin login (no main nav chrome)                          |
| `/admin`                 | Layout + `ProtectedAdminRoute`; default index = dashboard |
| `/admin/dashboard`       | Dashboard (same as index)                                 |
| `/admin/products`        | Products                                                  |
| `/admin/hero-image`      | Hero images                                               |
| `/admin/inventory`       | Inventory                                                 |
| `/admin/orders`          | Orders                                                    |
| `/admin/orders-enhanced` | Orders (enhanced)                                         |
| `/admin/customers`       | Customers                                                 |
| `/admin/marketing`       | Marketing                                                 |
| `/admin/promo-codes`     | Promo codes                                               |
| `/admin/analytics`       | Analytics                                                 |
| `/admin/error-reports`   | Error reports                                             |
| `/admin/email-testing`   | Email testing                                             |
| `/admin/reviews`         | Reviews moderation                                        |
| `/admin/api-status`      | API status                                                |
| `/admin/catalog`         | Product catalog                                           |
| `/admin/blog`            | Blog admin                                                |
| `/admin/translations`    | Translations                                              |
| `/admin/tags`            | Tags                                                      |
| `/admin/newsletter`      | Newsletter                                                |
| `/admin/settings`        | Settings                                                  |
