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

- **Cart:** `src/stores/cartStore.ts` + `useCartSync` — persisted; sync with Supabase depends on policy (below).
- **Wishlist:** `src/hooks/useWishlist.ts` (cloud + local paths; elevated users stay local-only).
- **Remote data:** Prefer TanStack Query with keys from `src/lib/checkout/queryKeys.ts` and shared `queryClient` where applicable.
- **Errors:** Typed helpers under `src/lib/errors/`; async code can use `trySafe`-style patterns documented in code.

### API usage

- Browser calls **Supabase client** (PostgREST, auth, realtime) and **invokes Edge Functions** for payment and order lookup flows.
- **Do not** put service role keys in the SPA; frontend uses `VITE_SUPABASE_PUBLISHABLE_KEY` only.

### Configuration and security headers

- CSP and service URLs: `src/config/app.config.ts` (source of truth), aligned with `public/_headers` and `index.html` meta fallback when you add new origins.

## Checkout and payment return

**Trust model:** Stripe webhooks are the **source of truth** for payment state. The UI after redirect is read-oriented.

```text
User pays (Stripe Checkout)
  → stripe-webhook (Edge) updates Supabase orders / payments
  → Browser: order-lookup (+ optional stripe-session-display for display)
  → PaymentSuccess / order confirmation UI (no legacy browser verify-payment for the main path)
```

- **order-lookup** authorizes reads using the Stripe **`session_id`** where relevant, so a mismatched “current Supabase user” after redirect does not block legitimate buyers.
- **verify-payment** Edge Function may remain deployed for compatibility or tests; the SPA does not rely on it for the primary Stripe success path. See `supabase/functions/verify-payment/README.md`.

### Polling and UX

- `src/lib/checkout/paymentPollingConfig.ts` drives **exponential backoff** within a max wait (env-tunable). After Stripe success, the UI favors **`success`**, **`processing`**, or **`delayed`** (long tail / reassurance) rather than a hard failure.
- **stripe-webhook** retries transient DB/PostgREST failures for critical writes (see function env: `WEBHOOK_DB_RETRY_*`, optional `WEBHOOK_TIMING_LOG`).

### Service worker

- `public/sw.js` bypasses caching for sensitive paths (e.g. `/order-confirmation`) so query strings and fresh HTML are not stale.

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

**Tests:** `src/lib/cart/cartSyncPolicy.test.ts`, `src/lib/checkout/checkoutStorageKeys.test.ts`, `src/lib/checkout/paymentPollingConfig.test.ts`; E2E: `cypress/e2e/elevated_storefront_spec.ts` (requires `ADMIN_*` or `CUSTOMER_*` in `cypress.env.json`).

## Known residual risks (honest)

- Webhook slower than UI poll budget → mitigated by **`delayed`** state and email/support CTAs; Stripe may still show paid in session display when available.
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
