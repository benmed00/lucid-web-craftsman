# Searchable type documentation

This file is the **TypeDoc project readme** (shown on the generated site home).

## How to generate

From the repo root:

```bash
pnpm run docs:typedoc
```

Open **`docs/generated/typedoc/index.html`** in a browser. Use the **search box** (top) to find symbols, Zod schemas, and parsers.

## What is included

- **`@/types/domain`** — Postgres-backed aliases (`OrderRow`, `OrderStatus`, …)
- **`@/types/contracts`** — Zod schemas and `parse*` helpers for Edge `invoke` responses
- **`order.types.ts`** — composite order / admin UI types (`Order`, `ORDER_STATUS_CONFIG`, …)

## See also

- `docs/DATA_TYPES.md` — layers and critical flows
- `docs/TYPES_INDEX.md` — flat, grep-friendly symbol index
