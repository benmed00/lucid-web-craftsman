## Summary

<!-- What changed and why (1–3 sentences). -->

## Checklist

- [ ] `pnpm run validate` passes locally (lint + format + types + unit tests + edge bundling check).
- [ ] If this PR touches **checkout, auth, payments, or edge functions**: ran at least **`pnpm run e2e:ci:smoke`** or a narrower script touching those flows (`e2e:checkout`, etc.).
- [ ] If this PR changes **Edge Functions contracts**: ran **`pnpm run api:artifacts`** / **`openapi:edge-functions:check`** where applicable.
- [ ] If this PR changes **scripts, docs, tests, or workflows** in the catalog: ran **`pnpm run project:catalog`** and committed `.github/project/catalog.json` + `PROJECT_CATALOG.md` when needed.
- [ ] **`supabase/functions` / Deno:** ran **`pnpm run verify:create-payment`**, **`pnpm run test:pricing-snapshot`**, or **`pnpm run verify:create-admin-user`** when relevant paths changed.
