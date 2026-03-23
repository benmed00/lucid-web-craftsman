# AGENTS.md

## Cursor Cloud specific instructions

### Services overview

| Service                        | Port | Command             | Notes                                                                                                       |
| ------------------------------ | ---- | ------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Vite dev server** (frontend) | 8080 | `npm run dev`       | React SPA; proxies `/api` and `/health` to the mock API; **`strictPort`** (no silent port drift vs Cypress) |
| **Mock API** (backend)         | 3001 | `npm run start:api` | Express + json-server; serves products, posts, cart, orders from `backend/db.json`                          |
| **Supabase**                   | —    | hosted cloud        | Hardcoded fallback URL/key in `src/integrations/supabase/client.ts`; no local setup needed                  |

### Running the app

Start the mock API first (`npm run start:api &`), then start the frontend (`npm run dev`). The Vite dev server runs on port **8080** and proxies `/api` to the mock API.

**Dev port & Cypress (single contract):** `cypress.config.ts` uses **`http://localhost:8080`** as `baseUrl` unless you set **`CYPRESS_BASE_URL`**. `vite.config.ts` sets **`strictPort: true`** so Vite **fails** if 8080 is busy instead of moving to 8081/8082 — that keeps `npm run dev` aligned with `e2e:ci`, **`e2e:checkout`**, and `start-server-and-test … http-get://localhost:8080`. Free 8080 before E2E, or point Cypress at the real origin via `CYPRESS_BASE_URL`. Details: [`cypress/README.md`](cypress/README.md) (Dev port contract).

### Key commands

See `package.json` scripts. Highlights:

- **E2E (CI-style):** `npm run e2e:ci` — full suite; **`npm run e2e:ci:smoke`** — only `@smoke`; **`npm run e2e:checkout`** — checkout flow + persistence specs only; **`npm run e2e:ci:shard`** — same as `e2e:ci` but runs a slice of spec files (`CYPRESS_SHARD` / `CYPRESS_SHARD_TOTAL`, see [`scripts/cypress-e2e-shard.mjs`](scripts/cypress-e2e-shard.mjs)). Smoke/full workflows start mock API (3001) + Vite (8080) then Cypress. GitHub **E2E**: **smoke** on PR/push to `main`; **full** uses **two parallel shard jobs** on schedule/`workflow_dispatch` (see [`docs/E2E-COVERAGE.md`](docs/E2E-COVERAGE.md)).
- **Typecheck:** `npm run type:check` — `tsc --noEmit` for `tsconfig.app.json`, `tsconfig.node.json`, and `cypress/tsconfig.json` (also runs in `npm run validate`).
- **Lint:** `npm run lint -- --max-warnings 9999` (0 errors expected; many pre-existing warnings)
- **Format check:** `npm run format:check`
- **Unit tests:** `npm run test:unit` (Vitest; excludes RLS tests)
- **Create-payment (Deno):** `npm run test:create-payment` (quick); **`npm run verify:create-payment`** matches CI (`deno check` + `deno lint` + `deno test` with **frozen** `supabase/functions/deno.lock`). Requires [Deno](https://deno.land/) v2 on `PATH`. GitHub Actions: workflow **Deno create-payment** on the same branches as root **CI** (`main`, `feat/backend-migration-and-cypress`, `yakov/git-state-cleanup`).
- **Build:** `npm run build`
- **CI validation:** `npm run validate` (does **not** run Cypress; use `e2e:ci` / `e2e:ci:smoke` separately).

**GitHub Actions:** **[`ci.yml`](.github/workflows/ci.yml)** runs lint, typecheck, unit tests, and build. **[`e2e.yml`](.github/workflows/e2e.yml)** runs Cypress separately (smoke on PR/push; full on weekly schedule; **`workflow_dispatch`** with **`suite`** `smoke` or `full`). Both use **concurrency** (`cancel-in-progress`) and minimal **`permissions`**.

### E2E route coverage

- See **[`docs/E2E-COVERAGE.md`](docs/E2E-COVERAGE.md)** for the full matrix (scripts, limits, what is / isn’t automated).
- **[`cypress/README.md`](cypress/README.md)** — operational runbook (commands, CI, secrets, troubleshooting); includes a French summary at the top.
- Extra routes are covered in [`cypress/e2e/payment_unsubscribe_routes_spec.js`](cypress/e2e/payment_unsubscribe_routes_spec.js) (`/payment-success`, `/unsubscribe`) and in the enterprise suite’s `PUBLIC_ROUTES` (includes `/compare`, `/wishlist`, `/orders`, `/payment-success`, `/unsubscribe`).
- Blog list → detail navigation uses stubbed Supabase responses in [`cypress/e2e/enterprise_full_platform_spec.js`](cypress/e2e/enterprise_full_platform_spec.js) so the test does not depend on real `blog_posts` data.
- **W10** — Avoid duplicating journeys: `enterprise_full_platform_spec.js` is a **macro** suite (routes, DOM, blog stub); detailed checkout, mobile menu, filters, auth, etc. live in their own specs. See **Propriété des parcours** in [`docs/E2E-COVERAGE.md`](docs/E2E-COVERAGE.md).

### Cypress E2E credentials

- Copy [`cypress.env.example.json`](cypress.env.example.json) to `cypress.env.json` (gitignored) and set `CUSTOMER_EMAIL` / `CUSTOMER_PASSWORD` for a real Supabase test user. Without these, `cy.loginAs('customer')` and profile/wishlist authenticated tests are skipped. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` for [`cypress/e2e/admin_dashboard_spec.js`](cypress/e2e/admin_dashboard_spec.js).
- **CI:** add the same repository secrets as needed for both **smoke** and **full** E2E jobs: `CYPRESS_CUSTOMER_EMAIL`, `CYPRESS_CUSTOMER_PASSWORD`, `CYPRESS_ADMIN_EMAIL`, `CYPRESS_ADMIN_PASSWORD`. [`cypress.config.ts`](cypress.config.ts) merges these into `Cypress.env()` under the same keys as `cypress.env.json` (`CUSTOMER_*`, `ADMIN_*`). See [`cypress/README.md`](cypress/README.md).

### Gotchas

- `.npmrc` sets `legacy-peer-deps=true`; this is required for dependency resolution.
- The `postinstall` script (`scripts/install-backend.cjs`) automatically installs `backend/` dependencies when running `npm install`.
- The `.env` file needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, but the Supabase client has hardcoded fallback values so the app works without them.
- ESLint uses flat config (ESLint 9); the config file is `eslint.config.js` (ESM).
- Vitest config is embedded in `vite.config.ts` (not a separate file).
- Prettier uses `"endOfLine": "lf"` (see `.prettierrc.json`) to match Linux CI; on Windows, prefer `git config core.autocrlf input` or let your editor save LF for tracked sources.
- Edge function tests (`src/tests/edge-functions.test.ts`) skip tests requiring `SUPABASE_SERVICE_ROLE_KEY` if not set.
- **`npm run test:ui`:** Vitest UI is bound to `127.0.0.1:24678` (not the default `51204`) because Windows can reserve port ranges that cause `EACCES` on the default port. Override with e.g. `npx vitest --ui --api.host 127.0.0.1 --api.port <port>` if needed.
- The `create-payment` edge function is split across `index.ts`, `types.ts`, `constants.ts`, and `lib/` (`verified-cart`, `discount`, `amounts`, `stripe-session`, `stripe-customer`, `orders`, `auth-user`, `checkout-schema`, `payment-events`, `stripe-client`, `errors`, `security`, `rate-limit`, `log`); data flow and audit notes live in `supabase/functions/create-payment/DATA_FLOW.md`; roadmap in `REFACTOR_PLAN.md`. From repo root: `npm run verify:create-payment` (or individual `deno:*:create-payment` scripts in `package.json`).
