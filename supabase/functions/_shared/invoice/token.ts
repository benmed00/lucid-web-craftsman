/**
 * HMAC-SHA256 signed tokens for guest order/invoice access.
 * Format: base64url(payload).base64url(signature)
 * Payload: { order_id, type, exp }
 *
 * Two token types:
 *   - 'order_access' (15 min) — for /order-confirmation page
 *   - 'invoice_access' (30 days) — for /invoice/:id page (sharable, in emails)
 */

const SECRET = Deno.env.get('INVOICE_SIGNING_SECRET') || '';
const INVOICE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const ORDER_TTL_SECONDS = 60 * 15; // 15 minutes

const enc = new TextEncoder();

export type TokenType = 'order_access' | 'invoice_access';

export interface TokenPayload {
  order_id: string;
  type: TokenType;
  exp: number;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(): Promise<CryptoKey> {
  if (!SECRET) throw new Error('INVOICE_SIGNING_SECRET not configured');
  return crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function signWith(payload: TokenPayload): Promise<string> {
  const payloadB64 = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await getKey();
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64)));
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

/** 30-day invoice token (backward-compatible). */
export async function signToken(order_id: string): Promise<string> {
  return signWith({
    order_id,
    type: 'invoice_access',
    exp: Math.floor(Date.now() / 1000) + INVOICE_TTL_SECONDS,
  });
}

/** 15-minute order-confirmation token. */
export async function signOrderToken(order_id: string): Promise<string> {
  return signWith({
    order_id,
    type: 'order_access',
    exp: Math.floor(Date.now() / 1000) + ORDER_TTL_SECONDS,
  });
}

/**
 * Verify token and return full payload. Throws on invalid signature, expiry,
 * or malformed data.
 */
export async function verifyTokenPayload(token: string): Promise<TokenPayload> {
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Malformed token');
  const [payloadB64, sigB64] = parts;

  const key = await getKey();
  const ok = await crypto.subtle.verify(
    'HMAC',
    key,
    b64urlDecode(sigB64),
    enc.encode(payloadB64),
  );
  if (!ok) throw new Error('Invalid token signature');

  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64))) as Partial<TokenPayload>;
  if (!payload.order_id) throw new Error('Token missing order_id');
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  // Backward compat: legacy invoice tokens may not have a type — assume invoice_access.
  const type: TokenType = payload.type === 'order_access' ? 'order_access' : 'invoice_access';
  return { order_id: payload.order_id, type, exp: payload.exp };
}

/** Backward-compatible: returns order_id only. */
export async function verifyToken(token: string): Promise<string> {
  const payload = await verifyTokenPayload(token);
  return payload.order_id;
}
