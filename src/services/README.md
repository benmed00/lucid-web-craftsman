# `src/services`

Reusable **API and integration** code for the SPA: Supabase (PostgREST, auth, storage, realtime), **`functions.invoke`**, and dev **mock HTTP** (`/api/*` → json-server).

| Doc                                                                            | Purpose                                                   |
| ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| [docs/PLATFORM.md — Client API layer](../../docs/PLATFORM.md#client-api-layer) | Where to add calls, admin vs storefront, mock vs Supabase |
| [docs/STANDARDS.md](../../docs/STANDARDS.md)                                   | Quality gates and API artifact scripts                    |

**Security:** Use only **`VITE_SUPABASE_PUBLISHABLE_KEY`** in the browser. Never add **`SUPABASE_SERVICE_ROLE_KEY`** (or any service role) to this tree. Admin modules use the **logged-in JWT**; enforcement is **RLS** + **`ProtectedAdminRoute`**.

**Naming (quick reference):**

- `*Api.ts` — feature or domain surface
- `admin*Api.ts` — dashboard
- `*Service.ts` — mixed or legacy helpers
- `apiClient` — [`src/lib/api/apiClient.ts`](../src/lib/api/apiClient.ts); use for relative **`/api/*`** calls while Vite proxies to the mock (see [docs/PLATFORM.md — Diagnosing API…](../docs/PLATFORM.md#diagnosing-api-and-database-failures))

Prefer extending a module here (then hooks / TanStack Query) over scattering `supabase.from(...)` in components.

**Realtime channel names:** Use a project prefix so subscriptions are easy to audit — e.g. `lwc-wishlist-<userId>` for wishlist postgres changes (`wishlistApi.ts`). Tear down channels in the same hook `useEffect` that created them.

**Cart server sync:** Call **`cartSyncService.persistUserCartLinesViaRpc`** (or **`invalidateCartServerLinesQuery`**) from cart sync logic so `cartServerQueryKeys` stay consistent; avoid calling `syncCartViaRpc` directly from hooks other than that service.
