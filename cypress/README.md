# End-to-end testing (Cypress)

**Navigation:** [Résumé (FR)](#french-operational-summary) · [Objectives (EN)](#objectives)

## French operational summary

_Contenu ci-dessous en français — English sections follow._

Ce dossier regroupe les **tests E2E navigateur** (Cypress). La **couverture fonctionnelle**, les limites métier et les scénarios hors périmètre sont décrits dans [`../docs/E2E-COVERAGE.md`](../docs/E2E-COVERAGE.md). Ce README décrit l’**exploitation** : commandes, configuration, CI et bonnes pratiques de sécurité.

| Thème             | Contenu                                                                                                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stack locale**  | Mock API **3001** → Vite **8080** (voir [`../AGENTS.md`](../AGENTS.md)).                                                                                                                                                                                                                    |
| **Configuration** | [`../cypress.config.ts`](../cypress.config.ts), [`../cypress.env.example.json`](../cypress.env.example.json) → `cypress.env.json` (non versionné).                                                                                                                                          |
| **Tags**          | `@smoke` (CI rapide sur PR), `@regression` (suite élargie), via `@cypress/grep`.                                                                                                                                                                                                            |
| **CI GitHub**     | **`ci.yml`** : lint, tests unitaires, build (sans Cypress). **`e2e.yml`** : Cypress — **smoke** sur push/PR ou dispatch `suite: smoke` ; **full** sur `schedule` ou dispatch `suite: full` (défaut). Les deux workflows : **concurrence** et **permissions** restreintes (voir runbook EN). |

**Scripts fréquents** (racine du dépôt) :

| Commande               | Usage                                               |
| ---------------------- | --------------------------------------------------- |
| `npm run e2e:ci`       | Lance API mock + Vite + **toute** la suite Cypress. |
| `npm run e2e:ci:smoke` | Idem, filtré **`@smoke`** (aligné sur la CI PR).    |
| `npm run e2e:open`     | Mode interactif (serveurs déjà démarrés).           |

**Secrets dépôt (optionnels)** pour limiter les tests ignorés en CI : `CYPRESS_CUSTOMER_EMAIL`, `CYPRESS_CUSTOMER_PASSWORD`, `CYPRESS_ADMIN_EMAIL`, `CYPRESS_ADMIN_PASSWORD` — fusionnés vers `CUSTOMER_*` / `ADMIN_*` dans `Cypress.env()` par `setupNodeEvents` dans `cypress.config.ts`.

Ne jamais committer `cypress.env.json` ni des identifiants de production.

**Avant une release :** `npm run validate` ne inclut **pas** Cypress ; enchaîner avec `npm run e2e:ci` (voir checklist dans [`../docs/E2E-COVERAGE.md`](../docs/E2E-COVERAGE.md)).

La suite détaillée en anglais suit ci-dessous.

---

The sections below are maintained in **English**. This directory contains the browser end-to-end (E2E) test suite for the web application. Tests validate critical user journeys, routing, and integration with the mock API and configured backends (including Supabase) under controlled conditions.

## Objectives

- **Regression safety:** Catch breaking changes in checkout, navigation, authentication flows, and high-traffic pages before release.
- **Repeatability:** Same commands locally and in continuous integration; deterministic stubs where external systems are out of scope (see project E2E coverage documentation).
- **Selective execution:** Tag-based filtering so teams can run a fast smoke subset or a full regression suite on demand.

## Scope and boundaries

Functional coverage, scripts, and explicitly **out-of-scope** scenarios (e.g. real card payments, certain timing-dependent UI) are documented in [`../docs/E2E-COVERAGE.md`](../docs/E2E-COVERAGE.md). This README focuses on how to run and maintain the Cypress suite, not on product requirements.

## Architecture

| Component                  | Role                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Application under test** | Vite dev server (default port **8080**).                                                                    |
| **Mock API**               | Express + json-server on port **3001**; Vite proxies `/api` and `/health` to it.                            |
| **Supabase**               | Hosted project; the app may use env-based URL/keys. Some tests stub or intercept network calls.             |
| **Cypress**                | Drives the browser against `baseUrl` (default `http://localhost:8080`, overridable via `CYPRESS_BASE_URL`). |

Configuration is centralized in [`../cypress.config.ts`](../cypress.config.ts) (including `@cypress/grep` for tags). Support code and custom commands live under [`support/`](support/).

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

- Node.js and npm per repository root.
- Dependencies installed from the project root (`npm install`).

### Environment variables

1. Copy [`../cypress.env.example.json`](../cypress.env.example.json) to **`cypress.env.json`** at the repository root (file is gitignored).
2. Set values as required by your scenarios:

   | Key                                    | Purpose                                                                     |
   | -------------------------------------- | --------------------------------------------------------------------------- |
   | `CUSTOMER_EMAIL` / `CUSTOMER_PASSWORD` | Supabase test user for customer `cy.loginAs('customer')` and related specs. |
   | `ADMIN_EMAIL` / `ADMIN_PASSWORD`       | Admin user for admin dashboard specs.                                       |
   | `DB_RESET_URL` / `DB_RESET_TOKEN`      | Optional server-side reset hook; only used when configured.                 |

Never commit `cypress.env.json` or embed production credentials in the repository.

### Running the stack

Start the mock API, then the frontend (see root [`../AGENTS.md`](../AGENTS.md)). Typical order:

1. Mock API on port 3001
2. Vite on port 8080

Then run Cypress using the npm scripts below.

## Command reference

Commands are defined in the root [`../package.json`](../package.json). Common entries:

| Script                   | Description                                                 |
| ------------------------ | ----------------------------------------------------------- |
| `npm run e2e:open`       | Interactive Cypress UI.                                     |
| `npm run e2e:run`        | Headless run of all specs (expects app already running).    |
| `npm run e2e:smoke`      | Headless; only `@smoke` (requires servers running).         |
| `npm run e2e:regression` | Headless; `@regression` subset.                             |
| `npm run e2e:ci`         | Starts mock API + Vite, then full `cypress run` (CI-style). |
| `npm run e2e:ci:smoke`   | Same as `e2e:ci` but filtered to `@smoke`.                  |

TypeScript checking for Cypress config and support code is included in root `npm run type:check`.

## Continuous integration

Lint, format, `type:check`, unit tests, and the production **build** run in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). **Cypress is not executed there** — browser E2E live only in [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml).

Both workflows declare **`permissions`** at minimum scope (`contents: read`; E2E also `actions: write` for failure **artifacts**). Both use **concurrency** with `cancel-in-progress` so a newer run on the same branch supersedes an in-flight one.

The E2E workflow runs:

- **Smoke** on pushes and pull requests to the configured default branch: `e2e:ci:smoke`.
- **Manual `workflow_dispatch`:** choose input **`suite`** — **`smoke`** or **`full`** (default **`full`**).
- **Full suite** on a weekly **`schedule`**, or when dispatching with **`suite: full`**: `e2e:ci`.

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
