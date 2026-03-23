# Documentation

This folder holds **maintained** technical documentation for the Rif Raw Straw storefront: how the platform behaves in production-minded terms, and which engineering standards the repo enforces.

| Document                                 | Purpose                                                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [**PLATFORM.md**](./PLATFORM.md)         | System shape: frontend layout, state, APIs, checkout/payment return, storefront isolation, **route inventory** (synced from `App.tsx`). |
| [**STANDARDS.md**](./STANDARDS.md)       | Quality bar: TypeScript, lint/format, tests, accessibility, security checks, API artifacts (OpenAPI / Postman).                         |
| [**E2E-COVERAGE.md**](./E2E-COVERAGE.md) | Cypress scope: scripts, CI jobs, what is automated vs out of scope.                                                                     |

**Operational runbooks** (commands, secrets, troubleshooting) stay next to the tools they describe:

- Local dev and AI agent shortcuts: [AGENTS.md](../AGENTS.md) (repo root)
- Cypress: [cypress/README.md](../cypress/README.md)
- Mock API in dev: [backend/README.md](../backend/README.md)

**Supabase / payments (deep dives)** remain with the code:

- `supabase/functions/create-payment/DATA_FLOW.md` — create-payment data path
- `supabase/functions/verify-payment/README.md` — legacy compatibility notes
- `docs/security/` — production checklist and baseline audit

**Optional database testing:**

- [`src/tests/rls-test-setup.md`](../src/tests/rls-test-setup.md) — RLS E2E setup against a real Supabase project

---

## Keeping docs accurate

| Change                                      | Update                                                                                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New or renamed **React routes**             | [`src/App.tsx`](../src/App.tsx) first, then the **Route inventory** in [PLATFORM.md](./PLATFORM.md).                                                            |
| **Checkout / payment / isolation** behavior | [PLATFORM.md](./PLATFORM.md) (SPA); Edge payload flow in [`supabase/functions/create-payment/DATA_FLOW.md`](../supabase/functions/create-payment/DATA_FLOW.md). |
| New **npm script** or CI gate               | [AGENTS.md](../AGENTS.md) and, if it is a standard developers must follow, [STANDARDS.md](./STANDARDS.md).                                                      |
| New **Cypress spec** or CI job              | [E2E-COVERAGE.md](./E2E-COVERAGE.md) and [cypress/README.md](../cypress/README.md).                                                                             |
| **RLS** test setup or policy expectations   | [rls-test-setup.md](../src/tests/rls-test-setup.md) and [security checklist](./security/supabase-production-security-checklist.md).                              |

If you add a new long-lived doc, link it from this file so it stays discoverable.
