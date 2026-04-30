# Supabase (project)

Database migrations, Edge Function configuration, and deploy settings for this app.

**Documentation:** [Documentation index](../docs/README.md) · [Platform behavior](../docs/PLATFORM.md) · [Security](../docs/security/supabase-production-security-checklist.md).

## Layout

| Path                           | Role                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| [`migrations/`](./migrations/) | Postgres schema and RLS — apply to your Supabase project in dependency order.                      |
| [`config.toml`](./config.toml) | Local CLI / function settings (`verify_jwt`, project id, etc.).                                    |
| [`functions/`](./functions/)   | Edge Function source — **[functions/README.md](./functions/README.md)** (index, OpenAPI, Postman). |

## CLI helpers (linked project)

From the repo root, with the project [linked](https://supabase.com/docs/guides/cli/managing-environments) (`supabase link`):

- `pnpm run supabase:migration:list` — compare local `migrations/` files to `schema_migrations` on the linked database (uses pinned CLI 2.90+ for consistent `db query` / listing behavior).
- `pnpm run supabase:migration:diff` — same comparison as a JSON summary plus `scripts/.migration-local-only-versions.txt` (gitignored) for batch `migration repair`.
- `pnpm run supabase:db:query -- -f supabase/migrations/<file>.sql` — execute a migration or ad-hoc SQL on the linked DB without going through `db push`.

If `migration list` or `db push` fails with **password authentication failed for user `cli_login_postgres`**, run `supabase login` and retry.

**Drift:** `pnpm run supabase:migration:diff` lists local versions missing from `schema_migrations`. If the database already reflects that SQL, repair history only (does not run SQL), e.g. PowerShell: `supabase migration repair --status applied @(Get-Content scripts/.migration-local-only-versions.txt) --yes`. If real DDL is missing, run `pnpm run supabase:db:query -- -f …` first, then `migration repair --status applied` for that version. When in sync, `supabase db push` prints **Remote database is up to date.**

## Related

- SPA env vars: root `.env.example` (`VITE_SUPABASE_*`).
- Contract artifacts: [`openapi/`](../openapi/), [`postman/`](../postman/) — regenerate from repo root (`pnpm run api:artifacts`); see [STANDARDS.md](../docs/STANDARDS.md).
