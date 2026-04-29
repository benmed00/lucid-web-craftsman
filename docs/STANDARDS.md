# Engineering standards

How we keep the codebase consistent, testable, and safe to ship. Command details also appear in [AGENTS.md](../AGENTS.md) and [package.json](../package.json).

## Quality gates (local / CI)

| Step                     | Command                                   | Notes                                                                                |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Lint                     | `npm run lint -- --max-warnings 9999`     | ESLint 9 flat config: `eslint.config.js`                                             |
| Format                   | `npm run format:check` / `npm run format` | Prettier; see table below                                                            |
| Types                    | `npm run type:check`                      | App + Vite + Cypress TS configs                                                      |
| Unit tests               | `npm run test:unit`                       | Vitest (embedded in `vite.config.ts`)                                                |
| Full validate (no E2E)   | `npm run validate`                        | Lint + e2e-port + format + types + edge bundling (`--no-deno`) + full Vitest `--run` |
| Build                    | `npm run build`                           | Production bundle                                                                    |
| E2E                      | `npm run e2e:ci` / `e2e:ci:smoke`         | Starts mock API + Vite; see [E2E-COVERAGE.md](./E2E-COVERAGE.md)                     |
| create-payment (Deno)    | `npm run verify:create-payment`           | Matches **Deno create-payment** CI: `deno check`, lint, test                         |
| create-admin-user (Deno) | `npm run verify:create-admin-user`        | Same workflow as **Deno create-payment** (check, lint, handler tests)                |

## Commit messages

Commits are checked with **Commitlint** (`commitlint.config.mjs`, conventional preset) via **Husky** (`.husky/commit-msg`). Forbidden one-word subjects include **Changes**, **wip**, **Save plan…** — use `type(scope): summary` with a real description. Merge / Revert lines are ignored. To bypass locally only (emergencies): `git commit --no-verify`.

## Merge from upstream / Lovable (`main`)

Branches that pull from **Lovable-backed** or noisy `main` should run the same cleanup the team used on large merges:

1. `npm install` (or `--package-lock-only --legacy-peer-deps` if only the lockfile moved)
2. **`npm run validate`**
3. **`npm run api:artifacts`** then commit if OpenAPI/Postman drift
4. Resolve conflicts first in **money paths** (`OrderConfirmation`, invoices, `currencyStore`, shared pricing) before wide refactors

Keeps CI (lint, format, OpenAPI) from failing on the next push.

## Working tree before push

Do not push **payments or admin edge** work with a **dirty git index** on those files — CI and reviewers must match the same bytes. Finish local edits, then commit (or stash) before `git push`.

## Git and dependencies

- `.npmrc`: `legacy-peer-deps=true` (required for this tree).
- `postinstall` installs `backend/` dependencies via `scripts/install-backend.cjs`.
- **Grandfathered ESLint / Deno escape hatches:** list and intent in [TECH_DEBT.md](./TECH_DEBT.md); shrink this list with refactors instead of growing it.

## Verifications (local, before PR)

Run these when you change code; CI runs the check-only variants inside `npm run validate` where applicable.

| Step                | Command                               | Role                                                                                                              |
| ------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Format (apply)**  | **`npm run format`**                  | Writes Prettier fixes project-wide. Run after substantive edits so diffs match CI (`format:check` in `validate`). |
| Format (check only) | `npm run format:check`                | Fails if any file would change; same gate as CI without modifying files.                                          |
| Lint                | `npm run lint -- --max-warnings 9999` | ESLint.                                                                                                           |
| Types               | `npm run type:check`                  | TypeScript, all app configs.                                                                                      |
| Unit tests          | `npm run test:unit`                   | Vitest.                                                                                                           |
| Full gate (no E2E)  | `npm run validate`                    | Lint + port lint + **format:check** + typecheck + bundling + full Vitest `--run`.                                 |

**Windows note:** Vitest UI uses `127.0.0.1:24678` by default to avoid reserved port ranges; see AGENTS.md.

## Prettier (`.prettierrc.json`)

| Option          | Value                                                   |
| --------------- | ------------------------------------------------------- |
| `semi`          | `true`                                                  |
| `trailingComma` | `"es5"`                                                 |
| `singleQuote`   | `true`                                                  |
| `printWidth`    | `80`                                                    |
| `tabWidth`      | `2`                                                     |
| `useTabs`       | `false`                                                 |
| `endOfLine`     | `"lf"` (match Linux CI; prefer LF in editor on Windows) |

Ignored paths: `.prettierignore`.

## Frontend API layer

Reusable **Supabase, Edge Functions, and mock `/api`** calls belong in **`src/services/`** (not inline in components). Entry point: [`src/services/README.md`](../src/services/README.md). Full conventions: [PLATFORM.md — Client API layer](./PLATFORM.md#client-api-layer). **State:** checkout and cart server writes use shared services (`checkoutApi` / `checkoutService`, `cartSyncService`) plus TanStack Query keys in `src/lib/checkout/queryKeys.ts` — details under [PLATFORM.md — State and data](./PLATFORM.md#state-and-data).

## Testing expectations

- **Unit / component:** Vitest + Testing Library; mock Supabase and network at boundaries; use `waitFor` for async UI.
- **Pricing / order confirmation / reconcile (shared `confirm-order`, snapshots):** Run **`npm run test:pricing-snapshot`** whenever you change checkout totals, `pricingSnapshot.ts`, Stripe/reconcile/send-order flows, or `OrderConfirmation.tsx` behaviors tied to persisted amounts — same bundle as **Deno create-payment → Deno test checkout pricing helpers** in CI (`_shared/confirm-order_test.ts` included).
- **Edge functions:** `src/tests/edge-functions.test.ts` — skips tests that need `SUPABASE_SERVICE_ROLE_KEY` when unset. Set it in **`.env`** at the repo root (no `VITE_` prefix; never expose in client code). See `.env.example`.
- **E2E:** Cypress with `@smoke` / `@regression` — prefer **`data-testid`** on **`/auth`** and checkout (see `auth-*`, `checkout-*` on `Auth.tsx`, `Checkout.tsx`) instead of asserting translated button copy alone — see [cypress/support](../cypress/support) selectors.
- **RLS:** Optional deeper tests; setup notes in `src/tests/rls-test-setup.md`.

## Accessibility

Target: **WCAG 2.1 AA**-oriented patterns.

- Skip link to main content; semantic landmarks (`header`, `nav`, `main`, headings in order).
- Forms: labels, `aria-required`, errors associated with fields (`aria-describedby` where used).
- Interactive targets ≥ 44px where applicable; visible `focus-visible` styles.
- Product cards: meaningful names and state (stock, price) exposed to assistive tech where implemented.
- Mobile menu: `aria-expanded`, `aria-controls`, keyboard operable.

Prefer existing primitives in `src/components/ui/` over one-off unlabeled controls.

## Security

- **Before production deploy:** walk [docs/security/supabase-production-security-checklist.md](./security/supabase-production-security-checklist.md).
- **Baseline findings / inventory:** [docs/security/supabase-security-audit-report.md](./security/supabase-security-audit-report.md).
- RLS on all public tables; no service role in browser; CSP and headers kept in sync with new third-party origins.

## API artifacts (contracts)

Regenerate and commit when Edge Function contracts change:

| Artifact                 | Command                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| OpenAPI (edge functions) | `npm run openapi:edge-functions` — `openapi/supabase-edge-functions.json`; drift check: `openapi:edge-functions:check`        |
| Postman collection       | `npm run postman:collection` — `postman/Lucid-Web-Craftsman.postman_collection.json`; drift check: `postman:collection:check` |
| Both                     | `npm run api:artifacts`                                                                                                       |

Per-function fragments: `supabase/functions/<name>/openapi.fragment.json`. Generated bundle lives under [`openapi/`](../openapi/) — see [`openapi/README.md`](../openapi/README.md). Postman layout: [`postman/README.md`](../postman/README.md).

## Edge function reference (in repo)

| Topic                                                  | Where                                                                                                                                                                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All functions (index)                                  | [`supabase/functions/README.md`](../supabase/functions/README.md)                                                                                                                                                     |
| create-payment payload → Stripe session                | [`DATA_FLOW.md`](../supabase/functions/create-payment/DATA_FLOW.md), [`REFACTOR_PLAN.md`](../supabase/functions/create-payment/REFACTOR_PLAN.md), [`constants.ts`](../supabase/functions/create-payment/constants.ts) |
| verify-payment role vs SPA                             | [`supabase/functions/verify-payment/README.md`](../supabase/functions/verify-payment/README.md)                                                                                                                       |
| SPA after redirect (order-lookup, webhooks, isolation) | [PLATFORM.md](./PLATFORM.md)                                                                                                                                                                                          |

Verify locally: `npm run verify:create-payment` (Deno); **`npm run verify:create-admin-user`** mirrors the privileged admin entrypoint.

## E2E credentials

Copy `cypress.env.example.json` → `cypress.env.json` for `CUSTOMER_*` / `ADMIN_*`. CI: repository secrets `CYPRESS_*` — see [cypress/README.md](../cypress/README.md).
