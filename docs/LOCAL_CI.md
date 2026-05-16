# Local CI parity (workflows without GitHub)

Run the **same gates** as GitHub Actions on your machine. This avoids “green locally / red in CI” surprises.

## One command (root `ci.yml` job)

Requires **Node 20+**, **pnpm**, and **Deno 2** on `PATH` (for full edge bundling).

```bash
pnpm install --frozen-lockfile
pnpm run ci:local
```

`ci:local` runs, in order: **lint** → **format:check** → **edge bundling (Deno)** → **OpenAPI drift** → **Postman drift** → **docs link check** → **docs auto-block drift** → **project catalog drift** → **typecheck** → **`test:unit`** → **production build** (with CI-like `VITE_*` placeholders).

### Weak points / differences vs GitHub

| Area                           | Risk                                                                              | Mitigation                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **OS line endings**            | `format:check` fails on CRLF vs LF.                                               | `git config core.autocrlf input` or save LF; see [STANDARDS.md](./STANDARDS.md).                          |
| **Deno not installed**         | `check:edge-functions:bundling:full` fails.                                       | Install Deno 2; or run `pnpm run check:edge-functions:bundling` (no `deno check`) for a lighter signal.   |
| **Full Vitest**                | `pnpm run validate` runs **all** Vitest specs; **root CI** uses `test:unit` only. | Use `ci:local` for PR parity; use `validate` for a stronger local gate.                                   |
| **E2E**                        | Needs mock API + Vite + Cypress; secrets for auth specs.                          | `pnpm run e2e:ci:smoke` (see [cypress/README.md](../cypress/README.md)); not part of `ci:local`.          |
| **Deno workflow**              | Second workflow: create-payment, create-admin-user, pricing guards.               | `pnpm run verify:create-payment` and `pnpm run verify:create-admin-user`.                                 |
| **Pricing-snapshot file list** | Duplicated between `.github/workflows/deno-create-payment.yml` and guards.        | [`ci-workflow-parity.test.ts`](../src/tests/ci-workflow-parity.test.ts) fails if listed files go missing. |

## Workflow → local command map

### [`ci.yml`](../.github/workflows/ci.yml)

| Step            | Local                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Install         | `pnpm install --frozen-lockfile`                                                                                         |
| Lint            | `pnpm run lint`                                                                                                          |
| Format          | `pnpm run format:check`                                                                                                  |
| Edge bundling   | `pnpm run check:edge-functions:bundling:full`                                                                            |
| OpenAPI         | `pnpm run openapi:edge-functions:check`                                                                                  |
| Postman         | `pnpm run postman:collection:check`                                                                                      |
| Docs links      | `pnpm run docs:check-links`                                                                                              |
| Docs auto-block | `pnpm run docs:gen:check`                                                                                                |
| Project catalog | `pnpm run project:catalog:check`                                                                                         |
| Typecheck       | `pnpm run type:check`                                                                                                    |
| Unit tests      | `pnpm run test:unit`                                                                                                     |
| Build           | `cross-env VITE_SUPABASE_URL=https://test.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=test-anon-key-for-ci pnpm run build` |

### [`e2e.yml`](../.github/workflows/e2e.yml)

| Job   | Local (typical)                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------- |
| Smoke | `pnpm run e2e:ci:smoke` (starts servers via `start-server-and-test`; see [AGENTS.md](../AGENTS.md)) |
| Full  | `pnpm run e2e:ci` or sharded `e2e:ci:shard`                                                         |

### [`deno-create-payment.yml`](../.github/workflows/deno-create-payment.yml)

Prefer the package scripts (same intent):

```bash
pnpm run verify:create-payment
pnpm run verify:create-admin-user
pnpm run test:pricing-snapshot
```

The workflow also runs a **bash guard** on pricing-snapshot test files (no `fetch`, no `Deno.env` in those paths). A drift-safe subset is enforced in Vitest: `src/tests/ci-workflow-parity.test.ts`.

## Optional: `act` (GitHub Actions locally)

[nektos/act](https://github.com/nektos/act) can run workflows in Docker; it is **not** required. Secrets and Cypress often need extra setup. Most contributors use `ci:local` + targeted `e2e:*` instead.

## Enterprise-style commits

When shipping typing/CI/doc changes together, prefer **small conventional commits**, for example:

1. `docs(types): TypeDoc and TYPES_INDEX`
2. `feat(types): domain aliases and order enum SSOT`
3. `refactor: remove explicit any; eslint error on src`
4. `chore(ci): ci:local script and workflow parity test`
5. `docs: LOCAL_CI runbook`

Use `git add -p` if hunks mix unrelated concerns.
