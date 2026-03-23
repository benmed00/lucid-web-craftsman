# Engineering standards

How we keep the codebase consistent, testable, and safe to ship. Command details also appear in [AGENTS.md](../AGENTS.md) and [package.json](../package.json).

## Quality gates (local / CI)

| Step                   | Command                                   | Notes                                                            |
| ---------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| Lint                   | `npm run lint -- --max-warnings 9999`     | ESLint 9 flat config: `eslint.config.js`                         |
| Format                 | `npm run format:check` / `npm run format` | Prettier; see table below                                        |
| Types                  | `npm run type:check`                      | App + Vite + Cypress TS configs                                  |
| Unit tests             | `npm run test:unit`                       | Vitest (embedded in `vite.config.ts`)                            |
| Full validate (no E2E) | `npm run validate`                        | Lint + format + typecheck + unit                                 |
| Build                  | `npm run build`                           | Production bundle                                                |
| E2E                    | `npm run e2e:ci` / `e2e:ci:smoke`         | Starts mock API + Vite; see [E2E-COVERAGE.md](./E2E-COVERAGE.md) |
| create-payment (Deno)  | `npm run verify:create-payment`           | Matches CI: `deno check`, lint, test, frozen lockfile            |

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

## Testing expectations

- **Unit / component:** Vitest + Testing Library; mock Supabase and network at boundaries; use `waitFor` for async UI.
- **Edge functions:** `src/tests/edge-functions.test.ts` — skips tests that need `SUPABASE_SERVICE_ROLE_KEY` when unset.
- **E2E:** Cypress with `@smoke` / `@regression` (and friends); avoid duplicating journeys already owned by focused specs — see E2E-COVERAGE “Propriété des parcours”.
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

| Topic | Where |
| ----- | ----- |
| All functions (index) | [`supabase/functions/README.md`](../supabase/functions/README.md) |
| create-payment payload → Stripe session | [`supabase/functions/create-payment/DATA_FLOW.md`](../supabase/functions/create-payment/DATA_FLOW.md), [`REFACTOR_PLAN.md`](../supabase/functions/create-payment/REFACTOR_PLAN.md) |
| verify-payment role vs SPA | [`supabase/functions/verify-payment/README.md`](../supabase/functions/verify-payment/README.md) |
| SPA after redirect (order-lookup, webhooks, isolation) | [PLATFORM.md](./PLATFORM.md) |

Verify locally: `npm run verify:create-payment` (Deno; frozen lockfile in CI).

## Git and dependencies

- `.npmrc`: `legacy-peer-deps=true` (required for this tree).
- `postinstall` installs `backend/` dependencies via `scripts/install-backend.cjs`.

## E2E credentials

Copy `cypress.env.example.json` → `cypress.env.json` for `CUSTOMER_*` / `ADMIN_*`. CI: repository secrets `CYPRESS_*` — see [cypress/README.md](../cypress/README.md).
