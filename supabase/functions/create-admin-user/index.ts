/**
 * @fileoverview Supabase Edge Function entry — `create-admin-user`.
 * @module supabase/functions/create-admin-user/index
 *
 * Filesystem snapshot (UTC; rerun `Get-ChildItem` / `stat` after substantive edits):
 * - Repository path: `supabase/functions/create-admin-user/index.ts`
 * - Size (bytes): 1134
 * - Created: 2026-01-24T20:19:34Z
 * - Last modified: 2026-04-29T17:15:12Z
 *
 * @description Wires Deno HTTP `serve()` to {@link handleCreateAdminRequest}; no request logic here.
 *
 * Deploy: `supabase functions deploy create-admin-user`
 *
 * @searchTags edge-function, supabase-edge, create-admin-user, Deno.serve
 *
 * **Runtime secrets (Supabase dashboard / Edge env)**
 * `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — injected by Supabase when deployed.
 *
 * **Tests**: `pnpm run test:create-admin-user` (delegates to `handler_test.ts` via `handler.ts`).
 */
import { serve } from '@std/http/server';
import { defaultCreateAdminDeps, handleCreateAdminRequest } from './handler.ts';

serve((req) => handleCreateAdminRequest(req, defaultCreateAdminDeps()));
