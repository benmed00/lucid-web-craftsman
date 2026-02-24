# AGENTS.md

## Cursor Cloud specific instructions

### Services overview

| Service                        | Port | Command             | Notes                                                                                      |
| ------------------------------ | ---- | ------------------- | ------------------------------------------------------------------------------------------ |
| **Vite dev server** (frontend) | 8080 | `npm run dev`       | React SPA; proxies `/api` and `/health` to the mock API                                    |
| **Mock API** (backend)         | 3001 | `npm run start:api` | Express + json-server; serves products, posts, cart, orders from `backend/db.json`         |
| **Supabase**                   | —    | hosted cloud        | Hardcoded fallback URL/key in `src/integrations/supabase/client.ts`; no local setup needed |

### Running the app

Start the mock API first (`npm run start:api &`), then start the frontend (`npm run dev`). The Vite dev server runs on port 8080 and proxies `/api` requests to port 3001.

### Key commands

See `package.json` scripts. Highlights:

- **Lint:** `npm run lint -- --max-warnings 9999` (0 errors expected; many pre-existing warnings)
- **Format check:** `npm run format:check`
- **Unit tests:** `npm run test:unit` (Vitest; excludes RLS tests)
- **Build:** `npm run build`
- **CI validation:** `npm run validate`

### Gotchas

- `.npmrc` sets `legacy-peer-deps=true`; this is required for dependency resolution.
- The `postinstall` script (`scripts/install-backend.cjs`) automatically installs `backend/` dependencies when running `npm install`.
- The `.env` file needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, but the Supabase client has hardcoded fallback values so the app works without them.
- ESLint uses flat config (ESLint 9); the config file is `eslint.config.js` (ESM).
- Vitest config is embedded in `vite.config.ts` (not a separate file).
- Edge function tests (`src/tests/edge-functions.test.ts`) skip tests requiring `SUPABASE_SERVICE_ROLE_KEY` if not set.
