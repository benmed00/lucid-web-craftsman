# Milestones & release train

Delivery milestones for **Lucid Web Craftsman**. Use them as **GitHub repository milestones** (Issues → Milestones) and on **GitHub Project #6** (Roadmap view + Target date). Machine-readable source: [`.github/milestones.yml`](../.github/milestones.yml).

**Bootstrap on GitHub (repo admin):**

```bash
node scripts/bootstrap-github-milestones.mjs
# node scripts/bootstrap-github-milestones.mjs --dry-run
```

**Platform catalog:** [`.github/project/README.md`](../.github/project/README.md) · generated inventory: [`pnpm run project:catalog`](../package.json).

---

## Active milestones

| ID  | Title                             | Target     | Status      | Exit criteria (minimum)                                                                                                                                               |
| --- | --------------------------------- | ---------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Platform catalog & CI governance  | 2026-05-31 | In progress | Merge PR #46; `pnpm run project:catalog:check` green; Project #6 delivery + catalog views; optional `bootstrap-github-labels` + milestone bootstrap                   |
| M1  | CI/CD parity & smoke contract     | 2026-06-30 | Open        | Root `ci.yml` + `e2e.yml` smoke on PR; `pnpm run validate` + `e2e:ci:smoke` documented in STANDARDS; port 8080 contract ([`E2E-COVERAGE.md`](E2E-COVERAGE.md))        |
| M2  | Checkout & payments truth         | 2026-07-31 | Open        | `pnpm run verify:create-payment` + `pnpm run test:pricing-snapshot`; OrderConfirmation / services refactor per [TECH_DEBT.md](TECH_DEBT.md); E2E checkout specs green |
| M3  | E2E depth & credentials           | 2026-07-31 | Open        | `e2e:ci` or weekly full shard green with `CYPRESS_*` secrets; checkout DB hydration spec; gaps in E2E-COVERAGE “Hors périmètre” triaged                               |
| M4  | Security & RLS proof              | 2026-08-31 | Open        | Optional scheduled job for `rls-e2e.test.ts` with real Supabase; [security checklist](security/supabase-production-security-checklist.md) reviewed                    |
| M5  | Storefront SEO & performance      | 2026-05-31 | Polish      | Hero LCP (srcset/sizes/preload); CSP/GA4; sitemap; core Web Vitals smoke in enterprise spec                                                                           |
| M6  | SPA architecture — services layer | 2026-08-31 | Open        | Remove TECH_DEBT grandfather imports (`Artisans`, `OrderConfirmation`, `ABThemeManager`); new pages use [`src/services/`](../src/services/README.md) only             |
| M7  | Types & API contracts             | 2026-07-31 | Open        | `pnpm run type:check`; `pnpm run api:artifacts` / drift checks; typed edge invoke paths                                                                               |
| M8  | Docs & agent runbooks             | 2026-06-30 | Open        | `docs/README` index current; TECH_DEBT items have issues; CHANGELOG updated each release                                                                              |

---

## Issue mapping (delivery board)

| Issue              | Milestone |
| ------------------ | --------- |
| #46                | M0        |
| #36, #35, #37      | M1        |
| #40, #44, #32, #33 | M2        |
| #39                | M3        |
| #30, #31           | M4        |
| #43                | M5        |
| #41                | M7        |
| #38, #42           | M8        |
| #25                | M1        |
| #34                | M2        |

---

## Retrospective (closed)

| ID         | Title                              | Notes                                                                                         |
| ---------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| M-retro-cp | create-payment refactor phases 0–5 | [REFACTOR_PLAN.md](../supabase/functions/create-payment/REFACTOR_PLAN.md) — all Done          |
| M-retro-03 | 2026-03 release                    | Coupon `usage_count`, wishlist channel `lwc-wishlist-<userId>` — [CHANGELOG.md](CHANGELOG.md) |

---

## Operating rhythm

| When           | Action                                                                |
| -------------- | --------------------------------------------------------------------- |
| Each PR        | Set milestone (M1–M8) if touching CI, checkout, edge, E2E, docs       |
| Weekly         | Review Project **Roadmap** view; adjust Target dates on epics         |
| Before release | `pnpm run validate` + targeted `e2e:*` / `verify:*`; update CHANGELOG |
| After doc edit | `pnpm run project:catalog` if milestones.yml or this file changed     |

---

## GitHub Project #6 views (summary)

1. **Delivery Roadmap** — Layout Roadmap; filter `-label:catalog/*`; use **Target date** on issues #25–#46.
2. **Platform inventory** — Table; filter `label:catalog/*` (scripts, tests, docs).
3. **Board by area** — Group by custom field **Area** for catalog or delivery.

Full steps: [`.github/project/README.md`](../.github/project/README.md#roadmap-and-milestones).
