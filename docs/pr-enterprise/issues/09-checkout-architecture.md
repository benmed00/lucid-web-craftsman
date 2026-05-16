## Goal

Refactor checkout client orchestration: split `useCheckoutPage` into focused modules under `src/hooks/checkout/`, enforce SPA layering (no raw `@/integrations/supabase/client` in pages/components), and document client-hint vs server-enforced rules.

## Acceptance criteria

- [ ] `useCheckoutPage` remains a thin orchestrator; payment, promo, steps, hydration, and totals live in `src/hooks/checkout/`.
- [ ] ESLint `no-restricted-imports` has no grandfather carve-outs for pages/components (tests may mock the client).
- [ ] `docs/CLIENT_VS_SERVER_RULES.md` linked from `docs/README.md` and `docs/RULES_REGISTRY.md`.
- [ ] Vitest: `checkoutPageTotals.test.ts` and `Checkout.test.tsx` pass in CI.

## Tracks

Related PR: #35 — `feat/platform-pnpm-supabase-rebaseline-edge-hardening`.
