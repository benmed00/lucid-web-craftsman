## Summary

<!-- What changed and why (1–3 sentences). -->

## Checklist

- [ ] `pnpm run validate` passes locally (lint + format + types + unit tests + edge bundling check).
- [ ] If this PR touches **checkout, auth, payments, or edge functions**: ran at least **`pnpm run e2e:ci:smoke`** or a narrower script touching those flows (`e2e:checkout`, etc.).
- [ ] If this PR changes **Edge Functions contracts**: ran **`pnpm run api:artifacts`** / **`openapi:edge-functions:check`** where applicable.
- [ ] **`supabase/functions` / Deno:** ran **`pnpm run verify:create-payment`**, **`pnpm run test:pricing-snapshot`**, or **`pnpm run verify:create-admin-user`** when relevant paths changed.
- [ ] **Rules / business-logic docs:** if this PR touches a rule surface indexed in [`docs/RULES_REGISTRY.md`](../docs/RULES_REGISTRY.md) sections **1–10**, update [`docs/RULES_REGISTRY.md`](../docs/RULES_REGISTRY.md) and/or [`docs/BUSINESS_LOGIC_AND_EDGE_CASES.md`](../docs/BUSINESS_LOGIC_AND_EDGE_CASES.md) in the same change — or add a one-line note in the PR description: `docs: not applicable because …`.
