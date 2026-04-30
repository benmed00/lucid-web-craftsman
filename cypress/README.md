# End-to-end testing (Cypress)

**Navigation:** [Résumé (FR)](#french-operational-summary) · [Objectives (EN)](#objectives)

## French operational summary

_Contenu ci-dessous en français — English sections follow._

Ce dossier regroupe les **tests E2E navigateur** (Cypress). Index documentation produit / stack : [`../docs/README.md`](../docs/README.md). La **couverture fonctionnelle**, les limites métier et les scénarios hors périmètre sont dans [`../docs/E2E-COVERAGE.md`](../docs/E2E-COVERAGE.md). Ce README décrit l’**exploitation** : commandes, configuration, CI et bonnes pratiques de sécurité. La **propriété des parcours** (checkout, menu mobile, filtres produits, etc. vs `enterprise_full_platform_spec`) est documentée dans [E2E-COVERAGE — Propriété des parcours](../docs/E2E-COVERAGE.md).

| Thème             | Contenu                                                                                                                                                                                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stack locale**  | Mock API **3001** → Vite **8080** par défaut (`strictPort`; `VITE_DEV_SERVER_PORT` pour un autre port — voir [Contrat de port](#dev-port-contract-vite--cypress)).                                                                                                                                                                    |
| **Configuration** | [`../cypress.config.ts`](../cypress.config.ts), [`../cypress.env.example.json`](../cypress.env.example.json) → `cypress.env.json` (non versionné).                                                                                                                                                                                    |
| **Tags**          | `@smoke` (CI rapide sur PR), `@regression` (suite élargie), via `@cypress/grep`.                                                                                                                                                                                                                                                      |
| **CI GitHub**     | **`ci.yml`** : lint, tests unitaires, build (sans Cypress). **`e2e.yml`** : Cypress — **smoke** sur push/PR ou dispatch `suite: smoke` ; **full** sur `schedule` ou dispatch `suite: full` (défaut) en **2 jobs parallèles** (`e2e:ci:shard`). Les deux workflows : **concurrence** et **permissions** restreintes (voir runbook EN). |

**Scripts fréquents** (racine du dépôt) :

| Commande               | Usage                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run e2e:ci`       | Lance API mock + Vite + **toute** la suite Cypress.                                                                          |
| `pnpm run e2e:ci:shard` | Comme `e2e:ci`, mais **un sous-ensemble de fichiers** specs (`CYPRESS_SHARD` / `CYPRESS_SHARD_TOTAL`) — job **e2e-full** CI. |
| `pnpm run e2e:ci:smoke` | Idem, filtré **`@smoke`** (aligné sur la CI PR).                                                                             |
| `pnpm run e2e:checkout` | Idem, uniquement **checkout** (`checkout_flow_spec`, `checkout_persistence_spec`, `checkout_db_hydration_spec`).             |
| `pnpm run e2e:contact`  | Idem, uniquement **`contact_form_spec.js`** (formulaire + intercept `submit-contact`).                                       |
| `pnpm run e2e:open`     | Mode interactif (serveurs déjà démarrés).                                                                                    |

**Secrets dépôt (optionnels)** pour limiter les tests ignorés en CI : `CYPRESS_CUSTOMER_EMAIL`, `CYPRESS_CUSTOMER_PASSWORD`, `CYPRESS_ADMIN_EMAIL`, `CYPRESS_ADMIN_PASSWORD` — fusionnés vers `CUSTOMER_*` / `ADMIN_*` dans `Cypress.env()` par `setupNodeEvents` dans `cypress.config.ts`.

Ne jamais committer `cypress.env.json` ni des identifiants de production.

**Avant une release :** `pnpm run validate` ne inclut **pas** Cypress ; enchaîner avec `pnpm run e2e:ci` (voir checklist dans [`../docs/E2E-COVERAGE.md`](../docs/E2E-COVERAGE.md)).

La suite détaillée en anglais suit ci-dessous.

---

The sections below are maintained in **English**. This directory contains the browser end-to-end (E2E) test suite for the web application. Tests validate critical user journeys, routing, and integration with the mock API and configured backends (including Supabase) under controlled conditions.

## Objectives

- **Regression safety:** Catch breaking changes in checkout, navigation, authentication flows, and high-traffic pages before release.
- **Repeatability:** Same commands locally and in continuous integration; deterministic stubs where external systems are out of scope (see project E2E coverage documentation).
- **Selective execution:** Tag-based filtering so teams can run a fast smoke subset or a full regression suite on demand.

## Scope and boundaries

Platform routes and behavior (for mapping specs to URLs) live in [`../docs/PLATFORM.md`](../docs/PLATFORM.md) and the doc index [`../docs/README.md`](../docs/README.md). Functional coverage, scripts, and explicitly **out-of-scope** scenarios (e.g. real card payments, certain timing-dependent UI) are documented in [`../docs/E2E-COVERAGE.md`](../docs/E2E-COVERAGE.md). That doc also lists **spec ownership** (W10): which file is canonical for checkout, mobile menu, product filters, etc., versus the thin `enterprise_full_platform_spec.js` macro suite. This README focuses on how to run and maintain the Cypress suite, not on product requirements.

## Architecture

| Component                  | Role                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Application under test** | Vite dev server on **8080** with **`strictPort: true`** (see [Dev port contract](#dev-port-contract-vite--cypress)).                       |
| **Mock API**               | Express + json-server on port **3001**; Vite proxies `/api` and `/health` to it.                                                           |
| **Supabase**               | Hosted project; the app may use env-based URL/keys. Some tests stub or intercept network calls.                                            |
| **Cypress**                | Drives the browser against `baseUrl` (default **`http://127.0.0.1:<port>`** via `VITE_DEV_SERVER_PORT`; override with `CYPRESS_BASE_URL`). |

Configuration is centralized in [`../cypress.config.ts`](../cypress.config.ts) (including `@cypress/grep` for tags). Support code and custom commands live under [`support/`](support/).

## Dev port contract (Vite + Cypress)

These pieces intentionally stay in lockstep:

1. **`vite.config.ts`** — `server.port` defaults to **8080**; set **`VITE_DEV_SERVER_PORT`** to use another port (must match the probe and Cypress — see `scripts/lib/e2e-port.mjs`). **`strictPort: true`** so Vite never silently picks 8081/8082 when the chosen port is busy.
2. **`cypress.config.ts`** — `baseUrl` defaults to **`http://127.0.0.1:<port>`** (`<port>` from **`VITE_DEV_SERVER_PORT`** if set, otherwise **8080**). Use **`CYPRESS_BASE_URL`** for preview/staging, or when both Vite and Cypress should follow a non-loopback origin you start yourself.
3. **`package.json`** — `e2e:ci`, `e2e:ci:smoke`, **`e2e:checkout`**, **`e2e:contact`**, etc. delegate to **`scripts/e2e-servers-and-test.mjs`**, which uses the same **`http-get://127.0.0.1:<port>/contact`** probe as `cypress-e2e-shard.mjs`. Mock API on **3001** is unchanged.

Operational summary: free the app port (default **8080**) before CI-style E2E, or run with e.g. **`VITE_DEV_SERVER_PORT=8173`** on one line so Vite, the probe, and Cypress all align. On Windows, **Apache / PEMHTTPD** commonly binds **8080** (service name often **`PEMHTTPD-x64`**); stop it as Administrator (`Stop-Service PEMHTTPD-x64` or **Services** UI) to reclaim **8080**, or leave it and use **`VITE_DEV_SERVER_PORT`**. Root [`../AGENTS.md`](../AGENTS.md) duplicates the short version for agents and local setup.

### Classifying failing network requests

When a spec or manual run fails on the network step, check the failing URL (DevTools or Cypress command log):

- Same-origin **`/api/...`** or **`/health/...`** → **Mock API** (port **3001**; ensure **`pnpm run start:api`** is running).
- **`*.supabase.co/rest/v1/...`** → **PostgREST / RLS** (session, guest headers, policies).
- **`*.supabase.co/functions/v1/...`** → **Edge Function** (deploy, secrets, CORS, body validation).

Full triage steps: [docs/PLATFORM.md — Diagnosing API and database failures](../docs/PLATFORM.md#diagnosing-api-and-database-failures). For **`cy.intercept`** against an Edge URL, see [`e2e/contact_form_spec.js`](e2e/contact_form_spec.js) (`submit-contact`).

**Automated stack (CI-style):** `pnpm run e2e:ci`, **`e2e:checkout`**, **`e2e:contact`**, and **`e2e:ci:smoke`** start the mock API and Vite via **`start-server-and-test`** (see **`package.json`**). **`pnpm run e2e:ci:shard`** uses [`scripts/cypress-e2e-shard.mjs`](../scripts/cypress-e2e-shard.mjs) with the same pattern and respects **`scripts/lib/e2e-port.mjs`** for the SPA probe URL.

## Repository layout

| Path                                                         | Description                                              |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| [`e2e/`](e2e/)                                               | Spec files (`*.js` / `*.ts`).                            |
| [`support/`](support/)                                       | `index.ts`, shared commands, TypeScript declarations.    |
| [`../cypress.config.ts`](../cypress.config.ts)               | E2E config, env merge for CI, grep plugin setup.         |
| [`../cypress.env.example.json`](../cypress.env.example.json) | Template for local secrets (copy to `cypress.env.json`). |

## Tagging strategy

Tests are tagged in `describe` / file headers for use with `@cypress/grep`:

| Tag               | Intended use                                                        |
| ----------------- | ------------------------------------------------------------------- |
| **`@smoke`**      | Short, high-signal checks suitable for frequent CI (pull requests). |
| **`@regression`** | Broader coverage; included in full local/scheduled CI runs.         |

When `grep` is set (e.g. `grep=@smoke`), non-matching specs are omitted per `cypress.config.ts` (`grepFilterSpecs`, `grepOmitFiltered`).

## Local setup

### Prerequisites

- Node.js and pnpm per repository root.
- Dependencies installed from the project root (`pnpm install`).

### Environment variables

1. Copy [`../cypress.env.example.json`](../cypress.env.example.json) to **`cypress.env.json`** at the repository root (file is gitignored).
2. Set values as required by your scenarios:

   | Key                                    | Purpose                                                                                       |
   | -------------------------------------- | --------------------------------------------------------------------------------------------- |
   | `CUSTOMER_EMAIL` / `CUSTOMER_PASSWORD` | Supabase test user for customer `cy.loginAs('customer')` and related specs.                   |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD`       | Admin user for admin dashboard + authenticated admin route smoke (`admin_routes_smoke_spec`). |
   | `DB_RESET_URL` / `DB_RESET_TOKEN`      | Optional server-side reset hook; only used when configured.                                   |

Never commit `cypress.env.json` or embed production credentials in the repository.

### Running the stack

Start the mock API, then the frontend (see root [`../AGENTS.md`](../AGENTS.md)). Typical order:

1. Mock API on port 3001
2. Vite on port 8080 (must be **8080** for default `baseUrl`; see [Dev port contract](#dev-port-contract-vite--cypress))

Then run Cypress using the pnpm scripts below.

## Command reference

Commands are defined in the root [`../package.json`](../package.json). Common entries:

| Script                   | Description                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run e2e:open`       | Interactive Cypress UI.                                                                                                                                       |
| `pnpm run e2e:run`        | Headless run of all specs (expects app already running).                                                                                                      |
| `pnpm run e2e:smoke`      | Headless; only `@smoke` (requires servers running).                                                                                                           |
| `pnpm run e2e:regression` | Headless; `@regression` subset.                                                                                                                               |
| `pnpm run e2e:ci`         | Starts mock API + Vite, then full `cypress run` (CI-style).                                                                                                   |
| `pnpm run e2e:checkout`   | Same stack; runs **checkout** specs only (`checkout_flow_spec.js`, `checkout_persistence_spec.js`, `checkout_db_hydration_spec.ts`).                          |
| `pnpm run e2e:contact`    | Same stack; runs **`contact_form_spec.js`** only (needs Vite SPA on 8080 — avoid bare `cypress run` without servers).                                         |
| `pnpm run e2e:ci:shard`   | Same stack; runs a **slice of spec files** via `CYPRESS_SHARD` / `CYPRESS_SHARD_TOTAL` (see `scripts/cypress-e2e-shard.mjs`). Used by **e2e-full** CI matrix. |
| `pnpm run e2e:ci:smoke`   | Same as `e2e:ci` but filtered to `@smoke`.                                                                                                                    |

TypeScript checking for Cypress config and support code is included in root `pnpm run type:check`.

## Continuous integration

Lint, format, `type:check`, unit tests, and the production **build** run in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). **Cypress is not executed there** — browser E2E live only in [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml).

Both workflows declare **`permissions`** at minimum scope (`contents: read`; E2E also `actions: write` for failure **artifacts**). Both use **concurrency** with `cancel-in-progress` so a newer run on the same branch supersedes an in-flight one.

The E2E workflow runs:

- **Smoke** on pushes and pull requests to the configured default branch: `e2e:ci:smoke`.
- **Manual `workflow_dispatch`:** choose input **`suite`** — **`smoke`** or **`full`** (default **`full`**).
- **Full suite** on a weekly **`schedule`**, or when dispatching with **`suite: full`**: two parallel jobs run **`e2e:ci:shard`** (spec files split across shards; see `docs/E2E-COVERAGE.md`).

Workflow-level environment variables supply test-safe `VITE_SUPABASE_*` values for the build. Optional **repository secrets** (same semantic keys as local env, prefixed for process injection):

| Repository secret           | Maps to Cypress env (via `setupNodeEvents` in `cypress.config.ts`) |
| --------------------------- | ------------------------------------------------------------------ |
| `CYPRESS_CUSTOMER_EMAIL`    | `CUSTOMER_EMAIL`                                                   |
| `CYPRESS_CUSTOMER_PASSWORD` | `CUSTOMER_PASSWORD`                                                |
| `CYPRESS_ADMIN_EMAIL`       | `ADMIN_EMAIL`                                                      |
| `CYPRESS_ADMIN_PASSWORD`    | `ADMIN_PASSWORD`                                                   |

If secrets are absent, specs that require credentials are skipped or guarded; this is expected in forks and local CI without test accounts.

## Security and compliance

- Treat `cypress.env.json` and CI secrets as **confidential**; use dedicated non-production test users with minimal privileges.
- Rotate test passwords when personnel or scope changes.
- Do not log secrets in Cypress commands or CI output.

## Troubleshooting

| Symptom                      | Check                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| Connection refused / timeout | Mock API (3001) and Vite (8080) running; `baseUrl` matches (`CYPRESS_BASE_URL` if used). |
| Auth-related skips           | `cypress.env.json` or CI secrets set; user exists in the target Supabase project.        |
| Grep runs zero specs         | Tag spelling; `grep` env matches `@cypress/grep` expectations.                           |

## Related documentation

- [`../docs/E2E-COVERAGE.md`](../docs/E2E-COVERAGE.md) — Coverage matrix, CI jobs, limitations, pre-release checklist.
- [`../AGENTS.md`](../AGENTS.md) — Service ports and project commands.
- [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml) — E2E workflow (smoke / full, permissions, concurrency).
- [Cypress documentation](https://docs.cypress.io/) — Official CLI and API reference.
