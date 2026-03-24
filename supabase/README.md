# Supabase (project)

Database migrations, Edge Function configuration, and deploy settings for this app.

**Documentation:** [Documentation index](../docs/README.md) · [Platform behavior](../docs/PLATFORM.md) · [Security](../docs/security/supabase-production-security-checklist.md).

## Layout

| Path                           | Role                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| [`migrations/`](./migrations/) | Postgres schema and RLS — apply to your Supabase project in dependency order.                      |
| [`config.toml`](./config.toml) | Local CLI / function settings (`verify_jwt`, project id, etc.).                                    |
| [`functions/`](./functions/)   | Edge Function source — **[functions/README.md](./functions/README.md)** (index, OpenAPI, Postman). |

## Related

- SPA env vars: root `.env.example` (`VITE_SUPABASE_*`).
- Contract artifacts: [`openapi/`](../openapi/), [`postman/`](../postman/) — regenerate from repo root (`npm run api:artifacts`); see [STANDARDS.md](../docs/STANDARDS.md).
