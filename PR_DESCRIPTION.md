# feat: Backend migration and Cypress E2E testing

This PR restructures the project with a dedicated `backend/` mock API, adds Cypress E2E testing, expands test coverage (Edge Functions, RLS), tightens environment and security configuration, and adds redirect/SPA routing. All conflicts with `main` have been resolved via merge; the Supabase client uses env vars while preserving main's guest session and realtime behavior.

---

## Backend Migration

### What Changed

- **Moved** `server.cjs` and `db.json` from project root → `backend/` folder
- **Added** dedicated backend package with: Express, json-server, cors, helmet, express-rate-limit
- **Added** `install-backend.cjs` postinstall script for backend dependency installation
- **Updated** root scripts: `postinstall`, `start`, `start:api` → `node backend/server.cjs`
- **Removed** `json-server` from root dependencies (now in `backend/`)
- **Fix:** Order ID generation now correctly included in created orders
- **Fix:** Support both `products` and `items` keys for mock API paginated responses (json-server returns `items`)
- **Fix:** Improved error handling for helmet and rateLimit middleware (graceful fallbacks)

### Backend Endpoints

| Method | Path                | Description                            |
| ------ | ------------------- | -------------------------------------- |
| GET    | `/`                 | API info & status                      |
| GET    | `/health`           | Health check                           |
| GET    | `/health/live`      | Liveness probe                         |
| GET    | `/health/ready`     | Readiness probe                        |
| GET    | `/api/info`         | API documentation                      |
| GET    | `/api/metrics`      | Request count, uptime                  |
| GET    | `/api/products`     | List products (paginate, search, sort) |
| GET    | `/api/products/:id` | Get product                            |
| GET    | `/api/posts`        | List posts                             |
| GET    | `/api/posts/:id`    | Get post                               |
| GET    | `/api/cart`         | Get cart                               |
| POST   | `/api/cart`         | Update cart                            |
| GET    | `/api/orders`       | List orders (paginated)                |
| POST   | `/api/orders`       | Create order                           |
| POST   | `/api/newsletter`   | Subscribe email                        |
| POST   | `/api/contact`      | Submit contact form                    |

### Vite Proxy

- `/api` and `/health` proxy to `http://localhost:3001` during development

---

## Environment & Security

- **`.env.example`** (root & backend): templates for `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, etc.
- **`.gitignore`**: ignore `.env`, `.env.local`, `.env.*.local`; added `.cursor` for editor config
- **Stopped tracking `.env`** in git to prevent credential exposure (rotate Supabase keys if previously committed)
- **`.npmrc`**: `legacy-peer-deps=true`

---

## Cypress E2E Testing

### Configuration

- **`cypress.config.ts`**: base URL `http://localhost:8080`, timeouts, retries, `@cypress/grep` plugin
- **Support**: cypress-axe for a11y, custom commands, ResizeObserver exception handling

### Custom Commands

- `cy.addProductToCart({ productId? })` — adds product to cart from `/products`
- `cy.resetDatabase()` — clears cookies/localStorage or calls `DB_RESET_URL`
- `cy.mockSupabaseResponse(method, path, scenario, body?)` — mocks Supabase REST responses (success, error 4xx/5xx, latency, timeout)

### Scripts

- `npm run e2e:open` — Cypress UI
- `npm run e2e:run` — headless run
- `npm run e2e:smoke` — run specs with `@smoke`
- `npm run e2e:regression` — run specs with `@regression`

---

## Supabase & Navigation

### Supabase Client (merged with main)

- **Uses env vars**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Validation**: throws if env vars missing
- **Preserved from main**: `global.fetch` for `x-guest-id` (prevents 42501 RLS errors), realtime config

### Navigation

- Semantic `ul`/`li` for nav links (accessibility)
- Classes `header-nav-root`, `header-nav` for E2E selectors

---

## Test Suite Additions & Fixes

### Edge Functions

- Integration tests for 15 Supabase Edge Functions (create-payment, verify-payment, stripe-webhook, send-order-confirmation, etc.)
- Unit tests for carrier mappings (DHL, Colissimo, Chronopost, generic)
- Shared `anonClient`/`serviceClient` with `persistSession: false` to avoid "Multiple GoTrueClient instances"

### RLS Tests

- **rls-e2e.test.ts**: refactor to single shared client with sign in/out between role blocks; fix anonymous SELECT assertions
- **rls-quick-validation.test.ts**: fix UPDATE/DELETE assertions; add `persistSession: false`
- **rls-policies.test.ts**: add policy coverage for `shipping_addresses`

### Other Fixes

- **UnifiedCache**: replace `vi.runAllTimersAsync()` with `await Promise.resolve()` in background refresh test
- **BlogCard**: mock `useImageLoader`, fix i18n assertions
- **AuthContext**: wrap with `QueryClientProvider`
- **Footer/ProductShowcase**: remove redundant roles
- **safeStorage**: use `Object.prototype.hasOwnProperty.call`
- **setupTests**: add `window.matchMedia` mock for theme store

### Documentation

- `docs/TEST-FEEDBACK.md`: test results, root causes, recommended priorities
- New script: `npm run test:edge-functions`

---

## Redirects & SPA Routing

- **`vercel.json`**: redirect `rifelegance.com` → `www.rifelegance.com`; SPA rewrites to `/index.html`
- **`public/_redirects`**: Netlify SPA fallback (`/* → /index.html`)

---

## Documentation & Linting

- **README**: updated for backend structure, `.env` setup, `start:api`, `e2e:run`/`e2e:open`, env var names
- **backend/README.md**: mock API documentation
- **ESLint**: rule overrides for a11y, `no-explicit-any`, etc.
- **prefer-const** fixes (useProductFilters, Checkout, AdminCustomers)

---

## Merge Resolution Summary

Conflicts with `origin/main` were resolved in the merge commit:

| File                                | Resolution                                                   |
| ----------------------------------- | ------------------------------------------------------------ |
| package-lock.json                   | Kept Cypress deps + main's fdir                              |
| src/integrations/supabase/client.ts | Combined: env vars + main's guest-id fetch + realtime config |

---

## How to Test

1. **Install**: `npm install`
2. **Backend**: `npm run start:api` (port 3001)
3. **Frontend**: `npm run dev` (port 8080)
4. **E2E**: `npm run e2e:open` with dev server running

---

## Risk Assessment

**Medium** — Adds Express/json-server backend, Cypress E2E harness, and env-driven Supabase. Local dev requires `npm run start:api` for mock API; deploy/preview flows remain unchanged.
