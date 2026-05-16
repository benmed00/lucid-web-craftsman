# Enterprise PR pack — `feat/platform-pnpm-supabase-rebaseline-edge-hardening`

Use this file when opening the PR on GitHub. **Do not commit secrets.** Ensure **uncommitted** changes (e.g. `docs/GITHUB-ACTIONS-CI-CD.md`) are committed or stashed before `git push`.

**Suggested PR title (Conventional Commits):**

```text
feat(platform): pnpm rebaseline, CI/CD docs, edge hardening, and test coverage
```

**Suggested GitHub labels (create if missing, then apply to the PR):**

| Label           | Color hint | When to use on this PR                          |
| --------------- | ---------- | ----------------------------------------------- |
| `type:feature`  | green      | Broad platform / product capability work        |
| `area:ci`       | blue       | Workflows, runbooks, local CI parity            |
| `area:docs`     | gray       | RUNBOOK, PLATFORM, rules registry, maps         |
| `area:supabase` | orange     | Edge functions, config, Deno tests              |
| `area:frontend` | purple     | React hooks, pages, performance, a11y refactors |
| `area:test`     | yellow     | Vitest/Cypress expansions                       |
| `size: XL`      | red        | Very large diff (requires staged review)        |
| `needs: review` | default    | Mandatory for enterprise merges                 |
| `risk: medium`  | brown      | Touches checkout, invoice, payments paths       |

Optional: `dependencies` (if `pnpm-lock.yaml` / `package.json` are central to the story), `security` (if reviewers must focus on auth/RLS/edge).

The same **PR description** text is kept in [**pr-body-only.md**](./pr-body-only.md) for `gh pr create --body-file` (edit `REPLACE_*` there after creating issues). From the repo root you can scaffold labels/issues with **`pnpm run pr:enterprise -- labels`**, **`pnpm run pr:enterprise -- issues`** (dry: **`pnpm run pr:enterprise -- issues --dry`**) or the shorter **`pr:enterprise:labels`** / **`pr:enterprise:issues`** scripts — see [pr-enterprise/README.md](./pr-enterprise/README.md).

---

## PR description (copy below — or use [pr-body-only.md](./pr-body-only.md))

---

### Summary

This branch rebases platform engineering on **`pnpm`**, tightens CI alignment (Vitest parity, Cypress smoke probe, workflows), expands **maintained documentation** (runbooks, rules registry, business logic, hooks, Typedoc paths), adds **contracts and domain typings**, hardens **checkout / invoice / Edge** surfaces (including `create-payment`, `confirm-order`, `generate-invoice`), improves **SEO and static assets** (sitemap, `llms.txt`, responsive Hero images), and significantly increases **unit test coverage** for hooks and stores. It is intended as an **enterprise-style integration PR** coordinated with discrete tracking issues below.

### Related issues

_Clone the “Issues to create” section into GitHub Issues first, then replace `REPLACE_N` with real numbers._

Fixes REPLACE_1, REPLACE_2, REPLACE_3, REPLACE_4, REPLACE_5, REPLACE_6, REPLACE_7, REPLACE_8

(Use **Fixes** only for issues fully resolved by this PR; use **Refs** for partial / follow-up work.)

### Scope & risk

- **High touch:** `package.json` / `pnpm-lock.yaml`, CI workflows, Supabase functions, checkout and invoice flows, admin surfaces.
- **Operational:** After merge, verify **GitHub Actions** on `main` (CI + optional E2E smoke) and consider refreshing [docs/GITHUB-ACTIONS-CI-CD.md](./GITHUB-ACTIONS-CI-CD.md) metrics snapshot.
- **Rollback:** Revert the merge commit; avoid partial reverts across money paths without reading [docs/CHECKOUT-PROD-RUNBOOK.md](./CHECKOUT-PROD-RUNBOOK.md).

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

(See [.github/pull_request_template.md](../.github/pull_request_template.md).)

---

## Issues to create in GitHub (titles + bodies)

Create **one issue per block**, attach labels from the table above, then link them in the PR description.

---

### Issue 1 — CI/CD alignment and Actions runbook

**Title:** `ci: workflows, smoke probe parity, and GITHUB-ACTIONS runbook`

**Labels:** `area:ci`, `type:documentation` (and `area:docs` if you use both)

```markdown
## Goal

Align CI with local parity (lint, format, types, Vitest slice, workflows) and maintain [docs/GITHUB-ACTIONS-CI-CD.md](docs/GITHUB-ACTIONS-CI-CD.md) as the single runbook.

## Acceptance criteria

- [ ] Workflows merged and passing on default branch after PR merge.
- [ ] KPI snapshot refreshed (or scheduled) per runbook cadence.

## Tracks

Related PR: feat/platform branch.
```

---

### Issue 2 — ESLint posture and `@typescript-eslint/no-explicit-any`

**Title:** `chore(lint): align eslint config with stricter posture on admin/UI surfaces`

**Labels:** `area:frontend`, `tech-debt` (optional)

```markdown
## Goal

`eslint.config.js` and related fixes; reduce or justify `any` in admin and shared components touched by the platform PR.

## Acceptance criteria

- [ ] `pnpm run lint` passes in CI.
- [ ] No new suppressions without comment / ticket reference where required by policy.
```

---

### Issue 3 — Platform documentation set (rules, business logic, maps)

**Title:** `docs: rules registry, business logic, tech map, and agent runbooks`

**Labels:** `area:docs`, `type:documentation`

```markdown
## Goal

Ship maintained docs: RULES_REGISTRY, BUSINESS_LOGIC_AND_EDGE_CASES, TECH_MAP, HOOKS, DATA_TYPES, etc.

## Acceptance criteria

- [ ] `docs/README.md` index matches new files.
- [ ] CODEOWNERS paths for rules/business logic remain accurate.
```

---

### Issue 4 — E2E smoke and internal SPA link coverage

**Title:** `test(e2e): smoke probe port alignment and internal links spec`

**Labels:** `area:test`, `area:ci`

```markdown
## Goal

Cypress: `e2e.yml` / port contract alignment; `internal_links_spa_spec.js`; smoke spec updates.

## Acceptance criteria

- [ ] `pnpm run e2e:ci:smoke` green locally with mock API + Vite.
```

---

### Issue 5 — Supabase Edge: checkout, confirm-order, invoice

**Title:** `supabase: create-payment schema, confirm-order tests, generate-invoice hardening`

**Labels:** `area:supabase`, `risk: medium`

```markdown
## Goal

Edge function changes and Deno tests for payment/invoice path; config/README updates.

## Acceptance criteria

- [ ] `pnpm run verify:create-payment` and relevant Deno tests pass.
- [ ] No breaking HTTP contract without OpenAPI/Postman refresh if required by repo policy.
```

---

### Issue 6 — Type contracts and domain model

**Title:** `types: edge invoke contracts, domain modules, Typedoc pipeline`

**Labels:** `area:frontend`, `type:feature`

```markdown
## Goal

`src/types/contracts`, `src/types/domain`, Typedoc config, `TYPES_INDEX.md`.

## Acceptance criteria

- [ ] `pnpm run type:check` passes.
- [ ] Contracts documented or linked from PLATFORM/STANDARDS as needed.
```

---

### Issue 7 — Scripts and local developer tooling

**Title:** `chore(scripts): audit metrics, doc link check, gen-docs, proxy/CA helpers`

**Labels:** `area:ci`, `type:chore`

```markdown
## Goal

`scripts/audit-src-metrics.mjs`, `check-doc-links.mjs`, `gen-docs.mjs`, `verify-proxy-ca.sh`, `deno-mode-toggle.sh`, `run-e2e-ci.mjs`.

## Acceptance criteria

- [ ] Documented in `scripts/README.md` / `docs/scripts/README.md` where applicable.
```

---

### Issue 8 — Performance, SEO, and static assets

**Title:** `perf/seo: OptimizedImage, Hero webp set, sitemap, llms.txt, index metadata`

**Labels:** `area:frontend`, `type:feature`

```markdown
## Goal

Image pipeline, public assets, `index.html` / robots / sitemap for storefront quality.

## Acceptance criteria

- [ ] No regression on LCP-critical paths in smoke test or manual spot-check.
```

---

## Quick `gh` commands (optional)

Replace issue numbers inside [pr-body-only.md](./pr-body-only.md) (`REPLACE_*`) before creating the PR.

```bash
# Optional: labels before issues
bash docs/gh-labels-enterprise-pr.sh

# Windows (PowerShell): same + create 8 issues + print "Fixes #…" line for pr-body-only.md
powershell -ExecutionPolicy Bypass -File docs/gh-labels-enterprise-pr.ps1
powershell -ExecutionPolicy Bypass -File docs/gh-issues-enterprise-platform.ps1
# Optional: -Repo "owner/name" | -DryRun

# PR body (replace REPLACE_* in docs/pr-body-only.md if you created issues manually):
gh pr create --base main --head feat/platform-pnpm-supabase-rebaseline-edge-hardening \
  --title "feat(platform): pnpm rebaseline, CI/CD docs, edge hardening, and test coverage" \
  --body-file docs/pr-body-only.md

# After PR exists:
gh pr edit <PR_NUMBER> \
  --add-label "type:feature" --add-label "area:ci" --add-label "area:docs" \
  --add-label "area:supabase" --add-label "area:frontend" --add-label "area:test" \
  --add-label "size: XL" --add-label "needs: review" --add-label "risk: medium"
```

---

## Companion files

| File                                                                     | Purpose                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [pr-body-only.md](./pr-body-only.md)                                     | Paste-safe PR description for GH                                   |
| [gh-labels-enterprise-pr.sh](./gh-labels-enterprise-pr.sh)               | Bash: `gh label create` helpers                                    |
| [gh-labels-enterprise-pr.ps1](./gh-labels-enterprise-pr.ps1)             | PowerShell 7+: same labels                                         |
| [gh-issues-enterprise-platform.ps1](./gh-issues-enterprise-platform.ps1) | Creates 8 issues; prints **`Fixes #…`** line for `pr-body-only.md` |
| [pr-enterprise/issues/](./pr-enterprise/issues/)                         | `--body-file` inputs per issue                                     |

---

## Discoverability

[docs/README.md](./README.md) indexes the enterprise pack and `pr-body-only.md`. Trim or archive these files after merge if you prefer a smaller docs tree.
