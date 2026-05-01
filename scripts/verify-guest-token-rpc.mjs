/**
 * Verifies PostgREST can call public.create_guest_token (anon JWT).
 *
 * Prerequisites: apply supabase/migrations/20260409011106_edef4db4-0e7c-49fd-befa-a691693a32a8.sql
 * (or full db push) to the target project.
 *
 * Usage (repo root):
 *   pnpm run verify:guest-token-rpc
 *
 * Reads URL/key from process.env and repo root env files (first match per key):
 *   .env, .env.local, .env.production
 *
 * Variables (any one key pair is enough):
 *   VITE_SUPABASE_URL or SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY
 *
 * Exit 0 when RPC returns 200 with guest_id; non-zero on misconfiguration or 404.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function parseEnvFile(raw) {
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

function tryLoadDotEnvFiles() {
  for (const name of ['.env', '.env.local', '.env.production']) {
    const p = path.join(root, name);
    try {
      parseEnvFile(fs.readFileSync(p, 'utf8'));
    } catch {
      /* missing or unreadable */
    }
  }
}

tryLoadDotEnvFiles();

const url = (
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ''
).replace(/\/+$/, '');
const key =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

if (!url || !key) {
  console.error(
    'Missing Supabase URL + anon/publishable key after loading .env, .env.local, .env.production.'
  );
  console.error(
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example), or pass env in the shell.'
  );
  process.exit(1);
}

const endpoint = `${url}/rest/v1/rpc/create_guest_token`;

const res = await fetch(endpoint, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: '{}',
});

const text = await res.text();
let body;
try {
  body = text ? JSON.parse(text) : null;
} catch {
  body = text;
}

if (!res.ok) {
  console.error(`create_guest_token HTTP ${res.status}`, body || text);
  if (res.status === 404) {
    console.error(
      'RPC not found or not exposed. Apply migration 20260409011106_edef4db4-0e7c-49fd-befa-a691693a32a8.sql (guest token section) then GRANT EXECUTE to anon, authenticated.'
    );
  }
  process.exit(1);
}

const guestId =
  body &&
  typeof body === 'object' &&
  'guest_id' in body &&
  typeof body.guest_id === 'string'
    ? body.guest_id
    : Array.isArray(body) &&
        body[0] &&
        typeof body[0] === 'object' &&
        typeof body[0].guest_id === 'string'
      ? body[0].guest_id
      : null;

if (!guestId) {
  console.error('Unexpected response shape (expected guest_id):', body);
  process.exit(1);
}

console.log('OK create_guest_token returned guest_id:', guestId.slice(0, 8) + '…');
