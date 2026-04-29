# Scripts

Node helpers invoked from **`package.json`** (and `postinstall`). Not imported by the Vite app at runtime.

**Behavior, CI gates, limitations:** [docs/scripts/README.md](../docs/scripts/README.md) · **Command reference:** [AGENTS.md](../AGENTS.md) · **Quality / API artifacts:** [STANDARDS.md](../docs/STANDARDS.md).

| File                                                                       | Used by                                                  | Purpose                                                                                                                            |
| -------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [`install-backend.cjs`](./install-backend.cjs)                             | `npm run postinstall`                                    | Installs `backend/` dependencies when present.                                                                                     |
| [`cypress-e2e-shard.mjs`](./cypress-e2e-shard.mjs)                         | `npm run e2e:ci:shard`                                   | Splits `cypress/e2e/*` across `CYPRESS_SHARD` / `CYPRESS_SHARD_TOTAL`.                                                             |
| [`openapi-edge-functions.mjs`](./openapi-edge-functions.mjs)               | `npm run openapi:edge-functions`                         | Writes [`openapi/supabase-edge-functions.json`](../openapi/supabase-edge-functions.json).                                          |
| [`openapi-edge-functions-check.mjs`](./openapi-edge-functions-check.mjs)   | `npm run openapi:edge-functions:check`                   | Regenerate OpenAPI + fail on git diff.                                                                                             |
| [`build-postman-collection.mjs`](./build-postman-collection.mjs)           | `npm run postman:collection`                             | Writes [`postman/Lucid-Web-Craftsman.postman_collection.json`](../postman/Lucid-Web-Craftsman.postman_collection.json).            |
| [`postman-collection-check.mjs`](./postman-collection-check.mjs)           | `npm run postman:collection:check`                       | Regenerate Postman + fail on git diff.                                                                                             |
| [`deploy-all-supabase-functions.mjs`](./deploy-all-supabase-functions.mjs) | `npm run deploy:functions:all`                           | Sequentially deploys every `supabase/functions/<name>/index.ts` (skips `_shared`). Requires `supabase link` + login.               |
| [`check-edge-functions-bundling.mjs`](./check-edge-functions-bundling.mjs) | `npm run validate`, `check:edge-functions:bundling*`, CI | Blocks sibling Edge Function imports (use `_shared/`); optional `deno check`. Flags in script header (`--baseline`, `--report-*`). |

`npm run api:artifacts` runs the OpenAPI generator then the Postman builder. See [`openapi/README.md`](../openapi/README.md) and [`postman/README.md`](../postman/README.md).
