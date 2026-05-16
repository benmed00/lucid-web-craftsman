# GitHub Project — Lucid Web Craftsman Platform

Enterprise board for scripts, tests, documentation, CI workflows, edge functions, and git health. Data is generated from the repo (`pnpm run project:catalog`).

| Artifact                                                               | Purpose                                                                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [catalog.json](./catalog.json)                                         | Machine-readable inventory (CI drift check)                                               |
| [PROJECT_CATALOG.md](./PROJECT_CATALOG.md)                             | Human tables for the Project description                                                  |
| [catalog.schema.json](./catalog.schema.json)                           | JSON schema for `catalog.json`                                                            |
| [reports/project-dashboard.html](../../reports/project-dashboard.html) | Charts (git activity, script/test breakdown) — regenerate locally; CI uploads as artifact |

## One-time: create the Project

```bash
gh project create --owner benmed00 --title "Lucid Web Craftsman — Platform" --format board
```

Note the project number from the URL (`.../projects/<number>`).

### Custom fields (Projects v2)

Create these single-select or text fields in the Project settings (names must match sync script):

| Field        | Type          | Options                                                                         |
| ------------ | ------------- | ------------------------------------------------------------------------------- |
| Area         | Single select | `storefront`, `checkout-payments`, `edge`, `admin`, `infra-ci`, `docs-security` |
| Layer        | Single select | `spa`, `edge`, `db`, `ci`, `docs`                                               |
| Item type    | Single select | `script`, `test`, `doc`, `workflow`, `tech-debt`, `git-metric`, `edge-function` |
| Verification | Text          | e.g. `pnpm run validate`                                                        |
| CI coverage  | Single select | `none`, `ci.yml`, `e2e-smoke`, `e2e-full`, `deno-workflow`, `manual-only`       |
| Doc link     | Text          | Relative path in repo                                                           |
| Health       | Single select | `healthy`, `drift-risk`, `stale`, `debt`                                        |

CLI examples (after project exists; replace `<number>`):

```bash
gh project field-create <number> --owner benmed00 --name "Area" --data-type "SINGLE_SELECT" \
  --single-select-options "storefront,checkout-payments,edge,admin,infra-ci,docs-security"
gh project field-create <number> --owner benmed00 --name "Layer" --data-type "SINGLE_SELECT" \
  --single-select-options "spa,edge,db,ci,docs"
gh project field-create <number> --owner benmed00 --name "Item type" --data-type "SINGLE_SELECT" \
  --single-select-options "script,test,doc,workflow,tech-debt,git-metric,edge-function"
gh project field-create <number> --owner benmed00 --name "Verification" --data-type "TEXT"
gh project field-create <number> --owner benmed00 --name "CI coverage" --data-type "SINGLE_SELECT" \
  --single-select-options "none,ci.yml,e2e-smoke,e2e-full,deno-workflow,manual-only"
gh project field-create <number> --owner benmed00 --name "Doc link" --data-type "TEXT"
gh project field-create <number> --owner benmed00 --name "Health" --data-type "SINGLE_SELECT" \
  --single-select-options "healthy,drift-risk,stale,debt"
```

### Recommended views

1. **Board** — Group by **Area**; filter labels `catalog/*`
2. **Table: Scripts & gates** — Filter `catalog/script`; sort by Verification
3. **Table: Test matrix** — Filter `catalog/test`
4. **Table: Documentation** — Filter `catalog/doc`
5. **Roadmap** — Tech debt + milestones from [docs/CHANGELOG.md](../../docs/CHANGELOG.md)
6. **Git hygiene** — Filter title contains `Git hygiene` or Health = `drift-risk`

Link the Project description to this folder and the dashboard artifact from Actions.

## Labels

```bash
node scripts/bootstrap-github-labels.mjs
# node scripts/bootstrap-github-labels.mjs --dry-run
```

Source: [.github/labels.yml](../labels.yml)

## Regenerate catalog

```bash
pnpm run project:catalog
pnpm run project:catalog:check   # CI: fail on catalog.json drift
```

## Sync inventory issues → Project (optional)

Repository secrets / variables:

| Name                   | Purpose                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_PROJECT_SYNC`  | Repository **secret** set to `true` to enable sync job on `workflow_dispatch`                                                          |
| `PROJECT_NUMBER`       | GitHub Project number (user or org project)                                                                                            |
| `GITHUB_PROJECT_OWNER` | Default: `benmed00`                                                                                                                    |
| `GITHUB_TOKEN`         | Fine-grained or classic PAT with `repo` + `project` (workflow uses `GITHUB_TOKEN` when sync runs in Actions with elevated permissions) |

```bash
# Dry-run (no API writes)
node scripts/sync-github-project.mjs --dry-run

# Live sync (needs GH_TOKEN or GITHUB_TOKEN)
PROJECT_NUMBER=1 node scripts/sync-github-project.mjs
```

Sync creates/updates issues titled `[catalog] …` with marker `<!-- catalog-id: … -->` in the body and adds them to the Project.

## Workflow

[`.github/workflows/project-catalog.yml`](../workflows/project-catalog.yml) runs on schedule, `workflow_dispatch`, and pushes that touch catalog sources. It runs `project:catalog:check` on PRs via root **CI** as well.
