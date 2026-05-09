# `src/types` — domain, contracts, and related modules

## Quick links

| Doc                                              | Purpose                                            |
| ------------------------------------------------ | -------------------------------------------------- |
| [docs/DATA_TYPES.md](../../docs/DATA_TYPES.md)   | SSOT → domain → Zod → UI                           |
| [docs/TYPES_INDEX.md](../../docs/TYPES_INDEX.md) | Searchable flat index of exports                   |
| [docs/TYPEDOC.md](../../docs/TYPEDOC.md)         | Generate searchable HTML (`pnpm run docs:typedoc`) |

## Folders

- **`domain/`** — Aliases from `Database['public']['Tables'][…]` and enums. **Import these** for persisted shapes.
- **`contracts/`** — Zod schemas + parsers for Supabase Edge `functions.invoke` JSON.
- **`order.types.ts`** — Composite order/admin types; enums and rows are re-exported from `domain/order`.

## IDE navigation

- Path alias: `@/types/...` (see root `tsconfig.app.json` → `paths`).
- **Go to definition** on `OrderRow` jumps to `domain/order.ts`; on `Database` jumps to `integrations/supabase/types.ts`.
