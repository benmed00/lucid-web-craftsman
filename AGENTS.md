# AGENTS.md

**Maintained narrative docs:** [docs/README.md](docs/README.md) (platform behavior, standards, E2E matrix).

**`validate` vs E2E vs Deno:** `pnpm run validate` runs lint/format/types/bundling + Vitest only — **not** Cypress and **not** the Deno edge workflows. See [docs/STANDARDS.md — What `pnpm run validate` covers](docs/STANDARDS.md#what-pnpm-run-validate-covers-vs-what-it-does-not). After checkout/auth/edge edits, run the relevant **`e2e:*`** or **`verify:*`** / **`test:pricing-snapshot`** scripts locally.

**SPA API modules:** [`src/services/README.md`](src/services/README.md) · full conventions: [docs/PLATFORM.md — Client API layer](docs/PLATFORM.md#client-api-layer). **Debugging “API or DB” issues:** start with [docs/PLATFORM.md — Diagnosing API and database failures](docs/PLATFORM.md#diagnosing-api-and-database-failures) (mock vs PostgREST vs Edge).

## Cursor Cloud specific instructions

### Services overview

| Service                        | Port | Command              | Notes                                                                                                       |
| ------------------------------ | ---- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Vite dev server** (frontend) | 8080 | `pnpm run dev`       | React SPA; proxies `/api` and `/health` to the mock API; **`strictPort`** (no silent port drift vs Cypress) |
| **Mock API** (backend)         | 3001 | `pnpm run start:api` | Express + json-server; serves products, posts, cart, orders from `backend/db.json`                          |
| **Supabase**                   | —    | hosted cloud         | Hardcoded fallback URL/key in `src/integrations/supabase/client.ts`; no local setup needed                  |

### Running the app

Start the mock API first (`pnpm run start:api &`), then start the frontend (`pnpm run dev`). The Vite dev server runs on port **8080** and proxies `/api` to the mock API.

**Dev port & Cypress (single contract):** Default app origin is **`http://127.0.0.1:8080`**. `vite.config.ts` **`strictPort`** and `cypress.config.ts` **`baseUrl`** follow **`VITE_DEV_SERVER_PORT`** when set (see **`scripts/lib/e2e-port.mjs`**, consumed by **`e2e:ci:shard`**; **`e2e:ci`** / **`e2e:checkout`** / **`e2e:contact`** / **`e2e:ci:smoke`** probe **`127.0.0.1:8080/contact`** via **`start-server-and-test`** in **`package.json`** unless you align those scripts with **`e2e-port.mjs`**). Use **`CYPRESS_BASE_URL`** for preview/deploy targets. If **8080** is taken (often **PEMHTTPD** / Apache on Windows), either stop that service as Administrator or set **`VITE_DEV_SERVER_PORT`** to a free port for `e2e:ci` / `pnpm run dev`. Details: [`cypress/README.md`](cypress/README.md) (Dev port contract).

### Key commands

See `package.json` scripts. Script implementations live under [`scripts/`](scripts/) — [`scripts/README.md`](scripts/README.md). Highlights:

- **E2E (CI-style):** `pnpm run e2e:ci` — full suite; **`pnpm run e2e:ci:smoke`** — only `@smoke`; **`pnpm run e2e:checkout`** — checkout flow + persistence + DB hydration specs; **`pnpm run e2e:contact`** — `contact_form_spec.js` only; **`pnpm run e2e:ci:shard`** — same as `e2e:ci` but runs a slice of spec files (`CYPRESS_SHARD` / `CYPRESS_SHARD_TOTAL`, see [`scripts/cypress-e2e-shard.mjs`](scripts/cypress-e2e-shard.mjs)). Smoke/full workflows start mock API (3001) + Vite (8080) then Cypress. GitHub **E2E**: **smoke** on PR/push to `main`; **full** uses **two parallel shard jobs** on schedule/`workflow_dispatch` (see [`docs/E2E-COVERAGE.md`](docs/E2E-COVERAGE.md)).
- **Typecheck:** `pnpm run type:check` — `tsc --noEmit` for `tsconfig.app.json`, `tsconfig.node.json`, and `cypress/tsconfig.json` (also runs in `pnpm run validate`).
- **Lint:** `pnpm run lint -- --max-warnings 9999` (0 errors expected; many pre-existing warnings)
- **Format:** **`pnpm run format`** — apply Prettier (writes files); run before commit when you want the tree aligned with CI. **`pnpm run format:check`** — verify only (also part of `pnpm run validate`). See [docs/STANDARDS.md — Verifications](docs/STANDARDS.md#verifications-local-before-pr).
- **Unit tests:** `pnpm run test:unit` (Vitest; **excludes [`rls-e2e.test.ts`](src/tests/rls-e2e.test.ts) + [`rls-quick-validation.test.ts`](src/tests/rls-quick-validation.test.ts)** only — same subset as [.github/workflows/ci.yml](.github/workflows/ci.yml); **`rls-policies.test.ts`** runs in CI).
- **Create-payment (Deno):** `pnpm run test:create-payment` (quick); **`pnpm run verify:create-payment`** matches CI (`deno check` + `deno lint` + `deno test`; no frozen lockfile — Supabase’s Docker bundler cannot read Deno 2 lockfile v5). Requires [Deno](https://deno.land/) v2 on `PATH`. GitHub Actions: workflow **Deno create-payment** on the same branches as root **CI** (`main`, `feat/backend-migration-and-cypress`, `yakov/git-state-cleanup`); the same workflow also **`deno check` / lint / test** [`create-admin-user`](supabase/functions/create-admin-user/) (**`pnpm run verify:create-admin-user`** locally).
- **Merge from noisy `main` / Lovable exports:** After syncing, follow [Merge from upstream / Lovable (`main`) — STANDARDS](docs/STANDARDS.md#merge-from-upstream--lovable-main): run **`pnpm run validate`**, **`pnpm run api:artifacts`** if contracts moved, resolve money-path conflicts (`OrderConfirmation`, invoicing/currency) before broad edits.
- **Deploy Edge (payment return):** **`pnpm run deploy:functions:payment-success`** — `order-lookup`, `stripe-session-display`, `verify-payment`. **`pnpm run deploy:functions:stripe-return`** — same plus `send-order-confirmation` and `stripe-webhook`. **`pnpm run deploy:functions:all`** — redeploy every function that has `supabase/functions/<name>/index.ts` (see [`scripts/deploy-all-supabase-functions.mjs`](scripts/deploy-all-supabase-functions.mjs)). `supabase/functions/deno.lock` and `supabase/functions/*/deno.lock` are **gitignored** so a Deno 2 lockfile v5 is not committed (the hosted bundler rejects it).
- **Pricing snapshot (checkout):** **`pnpm run test:pricing-snapshot`** — Deno tests (`assert-deno-v2.mjs`, then `--allow-env --allow-read=. --no-check --config supabase/functions/deno.json`) for `_shared/pricing-snapshot.ts`, related `_shared/*_test.ts`, `stripe-webhook/lib/pricing-snapshot.ts`, and `send-order-confirmation/_lib/email-pricing-from-db.ts`, plus Vitest for `src/lib/checkout/pricingSnapshot.test.ts` / `pricingSnapshotSchema.ts` (Zod). The same Deno files and flags run in **Deno create-payment** GitHub Actions under **Deno test checkout pricing helpers** (see `.github/workflows/deno-create-payment.yml`). **`pnpm run test:pricing-snapshot:deno`** runs the Deno portion only (`_shared` + webhook + email helper tests). **Contract & versioning rules:** [`supabase/functions/_shared/PRICING_SNAPSHOT.md`](supabase/functions/_shared/PRICING_SNAPSHOT.md) — read before evolving the snapshot shape.
- **Build:** `pnpm run build`
- **CI validation:** Root [.github/workflows/ci.yml](.github/workflows/ci.yml) (**`test:unit`** + lint + …) is **not** identical to **`pnpm run validate`**: **`validate`** uses **full Vitest** (see [STANDARDS — validate vs test:unit](docs/STANDARDS.md#validate-vs-testunit-vs-root-github-ci)). **`validate`** alone does **not** run Cypress; use `e2e:ci` / `e2e:ci:smoke` separately. **`ci.yml`** runs **`check:edge-functions:bundling:full`** (Deno 2).
- **OpenAPI (edge functions):** `pnpm run openapi:edge-functions` — writes [`openapi/supabase-edge-functions.json`](openapi/supabase-edge-functions.json). Optional per-function detail: `supabase/functions/<name>/openapi.fragment.json`. **`pnpm run openapi:edge-functions:check`** — regenerate + `git diff --exit-code` (for CI or pre-push). Notes: [`openapi/README.md`](openapi/README.md).
- **Postman:** `pnpm run postman:collection` — regenerates [`postman/Lucid-Web-Craftsman.postman_collection.json`](postman/Lucid-Web-Craftsman.postman_collection.json). **`pnpm run postman:collection:check`** — same drift check (CI runs this; saved examples use a **fixed** health `timestamp` so output is deterministic). **`pnpm run api:artifacts`** — runs both generators. Import the collection + [`postman/Lucid-Web-Craftsman.postman_environment.json`](postman/Lucid-Web-Craftsman.postman_environment.json); copy [`postman/Lucid-Web-Craftsman.local.postman_environment.example.json`](postman/Lucid-Web-Craftsman.local.postman_environment.example.json) to `postman/Lucid-Web-Craftsman.local.postman_environment.json` (gitignored) for real keys. Do not commit Postman Desktop folders under `postman/.postman/` or `postman/postman/` (gitignored). Notes: [`postman/README.md`](postman/README.md).
- **Edge Functions (folder index):** [`supabase/functions/README.md`](supabase/functions/README.md) — links to `DATA_FLOW`, `verify-payment`, OpenAPI, Postman.

**GitHub Actions:** **[`ci.yml`](.github/workflows/ci.yml)** runs lint, format check, edge-function bundling (`check:edge-functions:bundling:full`), OpenAPI/Postman drift checks, typecheck, unit tests, and build. **[`e2e.yml`](.github/workflows/e2e.yml)** runs Cypress separately (smoke on PR/push; full on weekly schedule; **`workflow_dispatch`** with **`suite`** `smoke` or `full`). Both use **concurrency** (`cancel-in-progress`) and minimal **`permissions`**.

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

- **Commits:** Husky runs **Commitlint** on `commit-msg` (`commitlint.config.mjs`) — use Conventional Commits (`feat(scope): summary`); one-word blobs like **`Changes`** fail. Bypass only deliberately: **`git commit --no-verify`**.
- `.npmrc` sets `legacy-peer-deps=true`; pnpm respects this — required for dependency resolution.
- **`pnpm-workspace.yaml`** includes **`backend/`**; run **`pnpm install`** at the repo root so SPA and mock API dependencies resolve together (**`pnpm-lock.yaml`**).
- The `.env` file needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, but the Supabase client has hardcoded fallback values so the app works without them.
- ESLint uses flat config (ESLint 9); the config file is `eslint.config.js` (ESM).
- Vitest config is embedded in `vite.config.ts` (not a separate file).
- Prettier uses `"endOfLine": "lf"` (see `.prettierrc.json`) to match Linux CI; on Windows, prefer `git config core.autocrlf input` or let your editor save LF for tracked sources.
- Edge function tests (`src/tests/edge-functions.test.ts`) skip tests requiring `SUPABASE_SERVICE_ROLE_KEY` if not set.
- **`pnpm run test:ui`:** Vitest UI is bound to `127.0.0.1:24678` (not the default `51204`) because Windows can reserve port ranges that cause `EACCES` on the default port. Override with e.g. `npx vitest --ui --api.host 127.0.0.1 --api.port <port>` if needed.
- The `create-payment` edge function is split across `index.ts`, `types.ts`, [`constants.ts`](supabase/functions/create-payment/constants.ts) (CORS, limits, origins; links to docs in its header), and `lib/` (`verified-cart`, `discount`, `amounts`, `stripe-session`, `stripe-customer`, `orders`, `auth-user`, `checkout-schema`, `payment-events`, `stripe-client`, `errors`, `security`, `rate-limit`, `log`); data flow and audit notes live in [`supabase/functions/create-payment/DATA_FLOW.md`](supabase/functions/create-payment/DATA_FLOW.md); roadmap in [`REFACTOR_PLAN.md`](supabase/functions/create-payment/REFACTOR_PLAN.md). From repo root: `pnpm run verify:create-payment` (or individual `deno:*:create-payment` scripts in `package.json`).
