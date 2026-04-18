/**
 * HMAC-SHA256 signed tokens for guest invoice access.
 * Format: base64url(payload).base64url(signature)
 * Payload: { order_id, exp }
 *
 * Uses Web Crypto (Deno-native), no external deps.
 */

const SECRET = Deno.env.get('INVOICE_SIGNING_SECRET') || '';
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const enc = new TextEncoder();

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

export async function signToken(order_id: string): Promise<string> {
  const payload = { order_id, exp: Math.floor(Date.now() / 1000) + TTL_SECONDS };
  const payloadB64 = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await getKey();
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64)));
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

export async function verifyToken(token: string): Promise<string> {
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

  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
  if (!payload.order_id) throw new Error('Token missing order_id');
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload.order_id as string;
}
