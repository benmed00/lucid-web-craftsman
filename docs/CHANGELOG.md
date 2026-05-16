# Changelog

Notable behavior fixes and operational notes. For day-to-day commands and CI, see [STANDARDS.md](./STANDARDS.md) and [AGENTS.md](../AGENTS.md). **Release train:** [MILESTONES.md](./MILESTONES.md).

## 2026-05

### Platform catalog & GitHub Project

- Added [`.github/project/`](../.github/project/) — `pnpm run project:catalog`, `project:catalog:check` in CI, inventory of scripts/tests/docs/workflows/edge functions.
- [MILESTONES.md](./MILESTONES.md) and [`.github/milestones.yml`](../.github/milestones.yml) define delivery milestones **M0–M8**; bootstrap with `node scripts/bootstrap-github-milestones.mjs`.

### Storefront SEO, performance, and analytics

- Hero image **LCP** improvements (dimensions, preload, `srcset` / `sizes`).
- **GA4**, **CSP** / `connect-src` updates, Google Search Console verification, sitemap coverage checks.
- SEO metadata and validation HTML for key routes (e.g. Artisans).

### Tooling & CI docs

- Cache parity guide, CI air-gapped Deno example, `DENO_CERT` documentation, request-id logging on edge paths.

## 2026-04

### Checkout, payments, and edge hardening

- **Pricing snapshot** contract (Deno + Vitest), golden tests, offline guards in Deno CI workflow.
- **create-payment** refactor phases 0–5 completed ([REFACTOR_PLAN.md](../supabase/functions/create-payment/REFACTOR_PLAN.md)).
- Platform rebase: pnpm workspace, Supabase baseline migration, E2E CI fixes, auth/checkout resilience.

### E2E and developer experience

- Cypress HTTP diagnostics, checkout/auth test ids, `127.0.0.1` port contract for Windows/CI parity.
- Commitlint + Husky; `validate` vs `test:unit` documented in STANDARDS.

## 2026-03

### Admin order coupons — `usage_count`

When staff apply a coupon to an order from the dashboard, **`bumpDiscountCouponUsageCountByCode`** (`src/services/adminOrderUiApi.ts`) loads the current **`usage_count`** from `discount_coupons`, increments it, and writes it back. That keeps **`usage_limit`** enforcement in checkout (`validate_coupon_code` / client-side checks) aligned with real redemptions tied to orders.

### Wishlist Realtime channel naming

Browser Realtime subscriptions for wishlist use the channel id **`lwc-wishlist-<userId>`** so client topics are prefixed and easy to distinguish from other channels.
