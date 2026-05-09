# TypeDoc (searchable HTML type catalog)

## Generate

```bash
pnpm run docs:typedoc
```

Output directory: **`docs/generated/typedoc/`** (gitignored). Open **`index.html`** in a browser.

## What you get

- **Search** across exported types, interfaces, const objects, Zod schemas, and parser functions for the scoped entry points.
- **Cross-links** between symbols when TSDoc `{@link …}` tags resolve.

## Entry points

Configured in [`typedoc.json`](../typedoc.json):

- [`src/types/domain/index.ts`](../src/types/domain/index.ts)
- [`src/types/contracts/index.ts`](../src/types/contracts/index.ts)
- [`src/types/order.types.ts`](../src/types/order.types.ts)

TypeScript project file: [`tsconfig.typedoc.json`](../tsconfig.typedoc.json).

## CI / publishing

The HTML bundle is **not** committed by default. To publish (e.g. GitHub Pages), add a workflow that runs `pnpm run docs:typedoc` and uploads `docs/generated/typedoc`.

TypeDoc may warn that `Json` (from `integrations/supabase/types.ts`) is referenced but not documented — safe to ignore unless you add that file as an entry point (very large).

## See also

- [DATA_TYPES.md](./DATA_TYPES.md) — architecture of typing layers
- [TYPES_INDEX.md](./TYPES_INDEX.md) — flat symbol index (grep-friendly)
