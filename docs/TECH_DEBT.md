# Technical debt backlog (explicit)

Tracked items supersede tacit carve-outs — each should eventually get an owner and an issue ticket.

## ESLint: SPA Supabase client imports

[`eslint.config.js`](../eslint.config.js) enforces **`no-restricted-imports`** for `@/integrations/supabase/client` in `src/pages/**` and `src/components/**` (tests may mock the module).

There are **no grandfather exceptions** in app sources: prefer [`src/services/`](../src/services/README.md), edge invokes, and shared hooks (`AuthContext`).

## ESLint `react-hooks/exhaustive-deps`

[`eslint.config.js`](../eslint.config.js) enforces **`react-hooks/exhaustive-deps`** at **`error`**. Hooks must list the values from the component scope that their effect/callback reads (see [React docs — Hooks](https://react.dev/reference/rules/rules-of-hooks)).

**Policy:**

- Prefer **fixing** dependency arrays (`useCallback` / `useMemo` for stable handlers, functional `setState` updates when merging state, module-level constants for static lists).
- Use **`eslint-disable-next-line react-hooks/exhaustive-deps`** only with a **short comment** explaining why (e.g. forwarded dependency list in a generic hook, mount-only timer). Do not disable project-wide.

**Baseline (May 2026):** rule was previously **`off`**; warnings were triaged and the rule was raised to **`error`** after clearing the backlog.

## Vitest skips (RLS and related suites)

**Live Supabase RLS suites** ([`src/tests/rls-e2e.test.ts`](../src/tests/rls-e2e.test.ts), [`rls-quick-validation.test.ts`](../src/tests/rls-quick-validation.test.ts)) use **`describe.skipIf(!isRealSupabase)`**. When **`VITE_*`** URLs/keys look like **placeholder `.env`** stubs (“test.supabase.co”, fake anon key), those suites **do not run** against a DB — **`pnpm run test`** / **`pnpm run validate`** can still be **green** without proving Row Level Security.

[`pnpm run test:unit`](../package.json) and **[`.github/workflows/ci.yml`](../.github/workflows/ci.yml)** exclude only **`rls-e2e.test.ts`** and **`rls-quick-validation.test.ts`**; they **run** [`rls-policies.test.ts`](../src/tests/rls-policies.test.ts) (offline **`POLICY_TESTS`** matrix — **not** live Row Level Security).

| Bucket                   | Meaning                                                                                                                                                                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Intentional skip**     | No hosted Supabase matching **`isRealSupabase`** — **e2e** / **quick-validation** suites avoid brittle mocks-only runs.                                                                                                                                                                                        |
| **Manual / secrets job** | Real RLS: seed accounts ([`src/tests/rls-test-setup.md`](../src/tests/rls-test-setup.md)), run **`npx vitest src/tests/rls-e2e.test.ts`**. Optional scheduled GitHub job with **`TEST_*`**, **`VITE_SUPABASE_*`** remains backlog — **[`STANDARDS.md`](STANDARDS.md#validate-vs-testunit-vs-root-github-ci)**. |

**Edge Functions HTTP suite** ([`src/tests/edge-functions.test.ts`](../src/tests/edge-functions.test.ts)): exercises live endpoints when **`SUPABASE_SERVICE_ROLE_KEY`** (and related env) are set; otherwise blocks skip. CI does not provide those secrets — run **`pnpm run test:edge-functions`** locally with secrets, or rely on Deno tests under **`supabase/functions/`** for offline coverage.

## Admin refunds (Stripe)

[`processRefund`](../src/services/orderService.ts) updates **`orders.metadata.refund_history`** and optionally **`order_status`** only. **`stripe_refund_id`** stays **`null`** until a **server-side** Stripe Refunds integration (recommended: Edge Function + service role, idempotent per PaymentIntent).

The admin UI ([`OrderPaymentTab`](../src/components/admin/orders/OrderPaymentTab.tsx)) states this explicitly; operators must complete card refunds in the **Stripe Dashboard**.

## Content Security Policy (CSP)

[`CSP_CONFIG`](../src/config/app.config.ts) uses the **resolved Supabase host** from **`VITE_SUPABASE_URL`** (fallback: baked project URL). **`img-src`** still allows **`https:`** as a broad fallback for CMS/product image URLs — tighten when asset origins are fixed. **`script-src`** remains permissive (`unsafe-inline` / `unsafe-eval`) until a nonce/hash build pipeline is feasible with Stripe/Vite.

## ESLint `@typescript-eslint/no-explicit-any` (SPA)

Production app sources enforce **`error`** on explicit **`any`** for the `src/**/*.{ts,tsx}` scope in [`eslint.config.js`](../eslint.config.js) (skips `**/*.{test,spec}.{ts,tsx}`, `src/tests/**`, `**/*.integration.{ts,tsx}`, `src/vite-env.d.ts`). Prefer `unknown`, generics, and narrowing instead of new **`any`**. Ambient Apple Pay / Google Pay globals live in [`src/types/window-extensions.d.ts`](../src/types/window-extensions.d.ts) (not `any`).

**Vendor pixel bootstraps:** [`src/lib/tracking/pixels.ts`](../src/lib/tracking/pixels.ts) keeps Meta/TikTok IIFE snippets under **`eslint-disable @typescript-eslint/no-explicit-any`** (third-party dynamic `fbq` / `ttq` shapes). Do not copy that pattern elsewhere.

**Warnings budget:** root **`pnpm run lint`** uses **`--max-warnings 0`** — fix or narrowly suppress new ESLint warnings before merging.

## RPC validation (staging / prod smoke)

After client changes to `supabase.rpc` payloads, confirm PostgREST behavior against a real project (staging first):

| RPC                         | What to verify                                                                                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`update_order_status`**   | Transition with **`p_reason_code` / `p_reason_message` / `p_actor_user_id` omitted** (or `undefined` in JS → keys omitted): history row should show **NULL** where expected; no 400 from UUID/text cast. |
| **`resolve_order_anomaly`** | Resolve from an **authenticated** admin session: **`p_resolved_by`** must be a real **`auth.users` UUID** (never empty string).                                                                          |

Local guard: [`src/services/adminOrdersApi.resolveAnomaly.test.ts`](../src/services/adminOrdersApi.resolveAnomaly.test.ts) asserts blank `resolvedBy` never calls RPC.

Automated optional probe (real Supabase): [`src/tests/rpc-postgrest-smoke.test.ts`](../src/tests/rpc-postgrest-smoke.test.ts) — `pnpm run test:rpc-smoke`; GitHub [`.github/workflows/rpc-postgrest-smoke.yml`](../.github/workflows/rpc-postgrest-smoke.yml) (`workflow_dispatch`).

## Architecture backlog (large modules — incremental split)

Tracked from remediation audit **vague 4**; avoid big-bang refactors — extract one domain at a time with tests.

| Area                       | Files (indicative)                                                                                                                         | Direction                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orders / payments client   | [`src/services/orderService.ts`](../src/services/orderService.ts)                                                                          | Split by concern (read paths vs admin mutations vs exports) behind existing service façade names where callers are numerous.                                |
| Cart / sync                | [`src/stores/cartStore.ts`](../src/stores/cartStore.ts)                                                                                    | Isolate persistence + BroadcastChannel + debounce into dedicated modules; keep store API stable.                                                            |
| Checkout / confirmation UI | [`src/pages/OrderConfirmation.tsx`](../src/pages/OrderConfirmation.tsx), [`src/hooks/useCheckoutPage.ts`](../src/hooks/useCheckoutPage.ts) (+ [`src/hooks/checkout/`](../src/hooks/checkout/)) | `useCheckoutPage` split into focused hooks under `checkout/`; continue presentational subcomponents on pages; align with [`src/services/`](../src/services/README.md). |
| Mock API monolith          | [`backend/server.cjs`](../backend/server.cjs)                                                                                              | Route modules + shared middleware when touching checkout/order mocks.                                                                                       |
| Routes shell               | [`src/App.tsx`](../src/App.tsx)                                                                                                            | Lazy route wrapper / route table module to dedupe `Suspense` boundaries.                                                                                    |
| Dual caches                | [`src/lib/cache/UnifiedCache.ts`](../src/lib/cache/UnifiedCache.ts) vs TanStack Query                                                      | Prefer Query as source of truth for server state; shrink UnifiedCache to true dedupe/navigation-only cases or deprecate with migration notes in call sites. |
| Storage adapters           | Zustand stores / hooks                                                                                                                     | Factor shared **safe localStorage** helpers into one module (e.g. `safeStorage.ts`) where duplication causes drift.                                         |

## Supabase Edge Functions (`ban-ts-comment`)

For **Deno** sources under [`supabase/functions/`](../supabase/functions/), [`eslint.config.js`](../eslint.config.js) turns **`@typescript-eslint/ban-ts-comment`** **off** because Node-based ESLint resolves Deno **`npm:`** / **`https:`** imports poorly. Prefer consolidating types under [**`_shared/`**](../supabase/functions/README.md) and generated **`database.types.ts`**. **`@ts-expect-error`**, **`@ts-ignore`**, and **`@ts-nocheck`** are **permitted when needed** — **do not add new pragmas** when types are available.
