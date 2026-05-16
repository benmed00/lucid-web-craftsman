# Issue evidence screenshots

PNG files under `issue-evidence/` are produced by `cypress/e2e/pr_issue_evidence_spec.js` and copied here for GitHub issue bodies.

```bash
pnpm run pr:enterprise:screenshots:capture
pnpm run pr:enterprise:screenshots:copy
git add docs/pr-enterprise/assets/issues/issue-evidence/
```

Issue markdown references use `raw.githubusercontent.com` on branch `feat/platform-pnpm-supabase-rebaseline-edge-hardening`.
