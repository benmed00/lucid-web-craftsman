# Technical debt backlog (explicit)

Tracked items supersede tacit carve-outs — each should eventually get an owner and an issue ticket.

## ESLint grandfathered imports (SPA)

[`eslint.config.js`](../eslint.config.js) enforces **`no-restricted-imports`** for `@/integrations/supabase/client` in `src/pages/**` and `src/components/**`.

**Grandfather exceptions** (temporary; refactor to services layer):

| File                                      | Notes                                                   |
| ----------------------------------------- | ------------------------------------------------------- |
| `src/components/admin/ABThemeManager.tsx` | merge-from-main carve-out                               |
| `src/pages/Artisans.tsx`                  | merge-from-main carve-out                               |
| `src/pages/OrderConfirmation.tsx`         | token-based flows; refactor with admin services roadmap |

Prefer new code through [`src/services/`](src/services/README.md) and shared hooks (`AuthContext`).

## Vitest skips (RLS and related suites)

**Live Supabase RLS suites** ([`src/tests/rls-e2e.test.ts`](../src/tests/rls-e2e.test.ts), [`rls-quick-validation.test.ts`](../src/tests/rls-quick-validation.test.ts)) use **`describe.skipIf(!isRealSupabase)`**. When **`VITE_*`** URLs/keys look like **placeholder `.env`** stubs (“test.supabase.co”, fake anon key), those suites **do not run** against a DB — **`pnpm run test`** / **`pnpm run validate`** can still be **green** without proving Row Level Security.

[`pnpm run test:unit`](../package.json) and **[`.github/workflows/ci.yml`](../.github/workflows/ci.yml)** exclude only **`rls-e2e.test.ts`** and **`rls-quick-validation.test.ts`**; they **run** [`rls-policies.test.ts`](../src/tests/rls-policies.test.ts) (offline **`POLICY_TESTS`** matrix — **not** live Row Level Security).

| Bucket                   | Meaning                                                                                                                                                                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Intentional skip**     | No hosted Supabase matching **`isRealSupabase`** — **e2e** / **quick-validation** suites avoid brittle mocks-only runs.                                                                                                                                                                                        |
| **Manual / secrets job** | Real RLS: seed accounts ([`src/tests/rls-test-setup.md`](../src/tests/rls-test-setup.md)), run **`npx vitest src/tests/rls-e2e.test.ts`**. Optional scheduled GitHub job with **`TEST_*`**, **`VITE_SUPABASE_*`** remains backlog — **[`STANDARDS.md`](STANDARDS.md#validate-vs-testunit-vs-root-github-ci)**. |

## ESLint `@typescript-eslint/no-explicit-any` (SPA)

Production app sources enforce **`warn`** on explicit **`any`** for the `src/**/*.{ts,tsx}` scope carved in [`eslint.config.js`](../eslint.config.js) (skips `**/*.{test,spec}.{ts,tsx}`, `src/tests/**`, `**/*.integration.{ts,tsx}`, `src/vite-env.d.ts`). Suppress sparingly (`unknown`, generics, narrowing) instead of drifting new **`any`**.

## Supabase Edge Functions (`ban-ts-comment`)

For **Deno** sources under [`supabase/functions/`](../supabase/functions/), [`eslint.config.js`](../eslint.config.js) turns **`@typescript-eslint/ban-ts-comment`** **off** because Node-based ESLint resolves Deno **`npm:`** / **`https:`** imports poorly. Prefer consolidating types under [**`_shared/`**](../supabase/functions/README.md) and generated **`database.types.ts`**. **`@ts-expect-error`**, **`@ts-ignore`**, and **`@ts-nocheck`** are **permitted when needed** — **do not add new pragmas** when types are available.
