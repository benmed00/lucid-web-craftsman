### Summary

This branch rebases platform engineering on **`pnpm`**, tightens CI alignment (Vitest parity, Cypress smoke probe, workflows), expands **maintained documentation** (runbooks, rules registry, business logic, hooks, Typedoc paths), adds **contracts and domain typings**, hardens **checkout / invoice / Edge** surfaces (including `create-payment`, `confirm-order`, `generate-invoice`), improves **SEO and static assets** (sitemap, `llms.txt`, responsive Hero images), and significantly increases **unit test coverage** for hooks and stores. It is intended as an **enterprise-style integration PR** coordinated with discrete tracking issues below.

### Related issues

_Create the issues from [enterprise-pr-pack-feat-platform-rebaseline.md](enterprise-pr-pack-feat-platform-rebaseline.md), then replace placeholders below._

Fixes #36, #37, #38, #39, #40, #41, #42, #43, #44

(Use **Fixes** only for issues fully resolved by this PR; use **Refs** for partial / follow-up work.)

### Scope & risk

- **High touch:** `package.json` / `pnpm-lock.yaml`, CI workflows, Supabase functions, checkout and invoice flows, admin surfaces.
- **Operational:** After merge, verify **GitHub Actions** on `main` (CI + optional E2E smoke) and consider refreshing [docs/GITHUB-ACTIONS-CI-CD.md](docs/GITHUB-ACTIONS-CI-CD.md) metrics snapshot.
- **Rollback:** Revert the merge commit; avoid partial reverts across money paths without reading [docs/CHECKOUT-PROD-RUNBOOK.md](docs/CHECKOUT-PROD-RUNBOOK.md).

### What changed (by theme)

| Theme              | Examples                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| CI / quality gates | `.github/workflows/*.yml`, `ci-workflow-parity.test.ts`, `run-e2e-ci.mjs`                                            |
| Documentation      | `BUSINESS_LOGIC_AND_EDGE_CASES.md`, `RULES_REGISTRY.md`, `GITHUB-ACTIONS-CI-CD.md`, `LOCAL_CI.md`, `DENO_CERT.md`, … |
| Edge / Deno        | `confirm-order`, `checkout-schema`, `generate-invoice`, pricing tests                                                |
| Types / contracts  | `src/types/contracts`, `src/types/domain`, Typedoc config                                                            |
| App / UX           | Footer, Contact, Invoice, admin dashboards, OptimizedImage, Hero assets                                              |
| Tests              | Large Vitest additions under `src/hooks`, `src/stores`, Cypress specs                                                |

### Testing performed

- [ ] `pnpm run validate`
- [ ] `pnpm run verify:create-payment` / `pnpm run test:pricing-snapshot` as applicable
- [ ] `pnpm run e2e:ci:smoke` when Cypress-relevant paths changed
- [ ] Spot-check **`/checkout`**, **invoice/token flow**, **admin orders** if touched

### Checklist

(See [.github/pull_request_template.md](.github/pull_request_template.md).)
