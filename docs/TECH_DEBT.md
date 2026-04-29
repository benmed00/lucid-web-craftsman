# Technical debt backlog (explicit)

Tracked items supersede tacit carve-outs — each should eventually get an owner and an issue ticket.

## ESLint grandfathered imports (SPA)

[`eslint.config.js`](../eslint.config.js) enforces **`no-restricted-imports`** for `@/integrations/supabase/client` in `src/pages/**` and `src/components/**`.

**Grandfather exceptions** (temporary; refactor to services layer):

| File                                      | Notes                                                   |
| ----------------------------------------- | ------------------------------------------------------- |
| `src/components/admin/ABThemeManager.tsx` | merge-from-main carve-out                               |
| `src/pages/Artisans.tsx`                  | merge-from-main carve-out                               |
| `src/pages/Logout.tsx`                    | merge-from-main carve-out                               |
| `src/pages/OrderConfirmation.tsx`         | token-based flows; refactor with admin services roadmap |

Prefer new code through [`src/services/`](src/services/README.md) and shared hooks (`AuthContext`).

## Supabase Edge Functions TypeScript escapes

For **Deno** edge functions [`supabase/functions/`](../supabase/functions/), ESLint allows `@typescript-eslint/ban-ts-comment` off because Node’s resolver cannot typecheck Deno `npm:`/`https:` URLs. Prefer removing `@ts-nocheck` in **new or touched** handlers when types are obtainable; consolidate shared types under `_shared/` and `database.types.ts`.
