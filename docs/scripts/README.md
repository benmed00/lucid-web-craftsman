# Node scripts (`scripts/`)

Companion to the **`package.json`** command catalog in [scripts/README.md](../../scripts/README.md) and [AGENTS.md](../../AGENTS.md). Here: **behavior**, **CI gates**, and **operational notes**. Source files remain under **`scripts/*.mjs`**.

## Edge Functions bundling checker

[`scripts/check-edge-functions-bundling.mjs`](../../scripts/check-edge-functions-bundling.mjs) enforces **Supabase’s one-bundle-per-function** rule: importing from another function’s folder (anything under `supabase/functions/<peer>/` besides `_shared/` and your own subtree) passes locally but **breaks the hosted bundler**. It also runs **`deno check`** unless disabled.

### What it checks

1. **Static analysis** — Walks sources under each function (depth-capped; skips **`node_modules`**, **dot dirs**, **symlinks**); matches `import` / `export … from` and literal `import('./relative')`; resolves relatives with the same extensions the script scans (including `.tsx`, `.jsx`, `.mts`, `.cjs`). Heuristic regexes cannot see **dynamic** specifiers (`import(variable)`).

2. **`deno check`** — `deno check --quiet --config supabase/functions/deno.json` on each **`index.ts`**. When enabled, **`node scripts/assert-deno-v2.mjs`** runs **once first** so CI and local failures are clearly “wrong Deno” vs “type/module error.”

### Important limitations

- **No `deno check --json`**: structured “issues” in reports come from a **regex parser** of stderr (`parseDenoErrors`). If Deno’s message format changes, parsing may miss lines. The **authoritative** failure text is always **`denoCheck.rawOutput`** on each function in **`--report-json`** output; HTML reports embed unparsed stderr when the heuristic returns nothing.
- **Import maps / remote bundler**: the script validates **repo layout + `deno.json`**, not every detail of Supabase’s hosted resolver.

### pnpm entry points

| Script                                 | Deno?            | Typical use                                                                         |
| -------------------------------------- | ---------------- | ----------------------------------------------------------------------------------- |
| `check:edge-functions:bundling`        | No (`--no-deno`) | Fast import-graph check; part of **`pnpm run validate`**.                            |
| `check:edge-functions:bundling:full`   | Yes              | Full `deno check` on every function; **root CI** runs this after Deno is installed. |
| `check:edge-functions:bundling:report` | No               | Same as default + writes JSON / HTML / compact error files under `reports/`.        |
| `check:edge-functions:bundling:ci`     | No               | Compact JSON on stdout for piping.                                                  |

See the **file header** in the script for **`--baseline`**, **`--filter-status`**, **`--filter-name`**, and report paths. Report filters **do not** change baseline comparison (baseline always diffs the **full** run).

## Bulk deploy — Edge Functions

- **`pnpm run deploy:functions:all`** runs **`check:edge-functions:bundling`** (import rules only, no Deno) **before** [`scripts/deploy-all-supabase-functions.mjs`](../../scripts/deploy-all-supabase-functions.mjs). The deploy script **does not** repeat that check.
- The deploy script lists every `supabase/functions/<name>/` directory with an **`index.ts`**, skips **`_shared`**, and runs **`supabase functions deploy <name>`** in order. Requires **`supabase link`**, login, and network.

## Other scripts (summary)

**OpenAPI / Postman drift checks** and **Cypress sharding**: see [scripts/README.md](../../scripts/README.md) and [STANDARDS.md](../STANDARDS.md). The mock API (`backend/`) is a **pnpm workspace** package; **`pnpm install`** at the repo root installs it with the SPA.

## When to update this doc

| Change                                                       | Update                                                                                         |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| New flags or behavior in `check-edge-functions-bundling.mjs` | This file + script header; [AGENTS.md](../../AGENTS.md) if `validate` / CI changes.            |
| New `scripts/*.mjs` used from `package.json`                 | [scripts/README.md](../../scripts/README.md) table + one line here if it affects CI or deploy. |
