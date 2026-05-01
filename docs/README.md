# Documentation

This folder holds **maintained** technical documentation for the Rif Raw Straw storefront: how the platform behaves in production-minded terms, and which engineering standards the repo enforces.

| Document                                          | Purpose                                                                                                                                                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**PLATFORM.md**](./PLATFORM.md)                  | System shape: frontend layout, **`src/services`** API layer, state, checkout/payment return, storefront isolation, **route inventory** (synced from `App.tsx`), **[diagnosing API/DB failures](./PLATFORM.md#diagnosing-api-and-database-failures)**. |
| [**STANDARDS.md**](./STANDARDS.md)                | Quality bar: TypeScript, lint/format, tests, accessibility, security checks, API artifacts (OpenAPI / Postman); commitlint; merge playbook.                                                                                                           |
| [**TECH_DEBT.md**](./TECH_DEBT.md)                | ESLint carve-outs (`no-restricted-imports`), Deno **`ban-ts-comment`** rationale — shrink with tickets, do not expand silently.                                                                                                                       |
| [**E2E-COVERAGE.md**](./E2E-COVERAGE.md)          | Cypress scope: scripts, CI jobs, what is automated vs out of scope.                                                                                                                                                                                   |
| [**docs/scripts/README.md**](./scripts/README.md) | Node helpers: Edge **bundling checker** (imports + optional `deno check`), **bulk deploy**, limitations and report flags.                                                                                                                             |

**Operational runbooks** (commands, secrets, troubleshooting) stay next to the tools they describe:

- Local dev and AI agent shortcuts: [AGENTS.md](../AGENTS.md) (repo root)
- Cypress: [cypress/README.md](../cypress/README.md)
- Mock API in dev: [backend/README.md](../backend/README.md)
- `package.json` automation: [scripts/README.md](../scripts/README.md) (file index) · **Scripts behavior & CI gates:** [docs/scripts/README.md](./scripts/README.md)
- Supabase (migrations + config + functions): [supabase/README.md](../supabase/README.md)
- SPA backend calls (Supabase / Edge / mock `/api`): [src/services/README.md](../src/services/README.md)

**Supabase / payments (deep dives)** remain with the code:

- [`supabase/functions/README.md`](../supabase/functions/README.md) — Edge Functions index (links to DATA_FLOW, verify-payment, OpenAPI, Postman)
- [`supabase/functions/create-payment/DATA_FLOW.md`](../supabase/functions/create-payment/DATA_FLOW.md) — create-payment data path
- [`supabase/functions/create-payment/constants.ts`](../supabase/functions/create-payment/constants.ts) — CORS, rate limits, cart caps, Stripe URL origins (cross-links to docs in file header)
- `supabase/functions/verify-payment/README.md` — legacy compatibility notes
- `docs/security/` — production checklist and baseline audit

**Generated API artifacts:**

- [`openapi/README.md`](../openapi/README.md) — OpenAPI bundle for Edge Functions
- [`postman/README.md`](../postman/README.md) — Postman collection and environments

**Optional database testing:**

- [`src/tests/rls-test-setup.md`](../src/tests/rls-test-setup.md) — RLS E2E setup against a real Supabase project

---

## Keeping docs accurate

| Change                                           | Update                                                                                                                                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API or DB "broken" (which layer?)**            | Use [PLATFORM.md — Diagnosing API and database failures](./PLATFORM.md#diagnosing-api-and-database-failures) before changing migrations or Edge code.                                                                                                   |
| New or renamed **React routes**                  | [`src/App.tsx`](../src/App.tsx) first, then the **Route inventory** in [PLATFORM.md](./PLATFORM.md).                                                                                                                                                    |
| New **Supabase / Edge / mock HTTP** from the SPA | Extend [`src/services/`](../src/services/) per [PLATFORM.md — Client API layer](./PLATFORM.md#client-api-layer).                                                                                                                                        |
| **Checkout / payment / isolation** behavior      | [PLATFORM.md](./PLATFORM.md) (SPA); Edge payload flow in [`DATA_FLOW.md`](../supabase/functions/create-payment/DATA_FLOW.md); CORS/limits/origins in [`constants.ts`](../supabase/functions/create-payment/constants.ts).                               |
| New **npm script** or CI gate                    | [AGENTS.md](../AGENTS.md), [scripts/README.md](../scripts/README.md) (if you add a `scripts/*.mjs` helper), [docs/scripts/README.md](./scripts/README.md) when behavior or gates change, and [STANDARDS.md](./STANDARDS.md) when it is a required gate. |
| **Edge Function** HTTP contract or Postman       | `openapi.fragment.json` / handler changes, then `pnpm run api:artifacts` (or individual generators); see [openapi/README.md](../openapi/README.md) and [postman/README.md](../postman/README.md).                                                       |
| New **Cypress spec** or CI job                   | [E2E-COVERAGE.md](./E2E-COVERAGE.md) and [cypress/README.md](../cypress/README.md).                                                                                                                                                                     |
| **RLS** test setup or policy expectations        | [rls-test-setup.md](../src/tests/rls-test-setup.md) and [security checklist](./security/supabase-production-security-checklist.md).                                                                                                                     |

If you add a new long-lived doc, link it from this file so it stays discoverable.
