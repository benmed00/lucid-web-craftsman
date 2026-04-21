/**
 * Tests for get-order-by-token verification logic.
 * These tests target the token verification layer (the deterministic part).
 * DB integration is exercised manually via curl after deploy.
 */
import { assertEquals, assertRejects } from 'jsr:@std/assert@^1';

// Set secret BEFORE importing the token module.
Deno.env.set('INVOICE_SIGNING_SECRET', 'test-secret-for-unit-tests');

const { signOrderToken, signToken, verifyTokenPayload } = await import(
  '../_shared/invoice/token.ts'
);

Deno.test('signOrderToken → verifyTokenPayload roundtrip', async () => {
  const token = await signOrderToken('order-123');
  const payload = await verifyTokenPayload(token);
  assertEquals(payload.order_id, 'order-123');
  assertEquals(payload.type, 'order_access');
  // 15-minute TTL
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now || payload.exp > now + 16 * 60) {
    throw new Error(`exp out of range: ${payload.exp}`);
  }
});

Deno.test('verifyTokenPayload rejects malformed token', async () => {
  await assertRejects(() => verifyTokenPayload('not-a-token'), Error);
  await assertRejects(() => verifyTokenPayload('a.b.c'), Error);
});

Deno.test('verifyTokenPayload rejects bad signature', async () => {
  const token = await signOrderToken('order-123');
  const [payloadB64] = token.split('.');
  const tampered = `${payloadB64}.AAAA`;
  await assertRejects(() => verifyTokenPayload(tampered), Error, 'Invalid token signature');
});

Deno.test('verifyTokenPayload rejects expired token', async () => {
  // Forge an expired token using the same secret.
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode('test-secret-for-unit-tests'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const payload = { order_id: 'o', type: 'order_access', exp: 1 };
  const b64 = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payloadB64 = b64(JSON.stringify(payload));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64)));
  let bin = '';
  for (const x of sig) bin += String.fromCharCode(x);
  const sigB64 = b64(bin);
  await assertRejects(() => verifyTokenPayload(`${payloadB64}.${sigB64}`), Error, 'Token expired');
});

Deno.test('signToken (invoice) yields invoice_access type', async () => {
  const token = await signToken('order-xyz');
  const payload = await verifyTokenPayload(token);
  assertEquals(payload.type, 'invoice_access');
  // 30-day-ish TTL
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now + 29 * 24 * 3600) {
    throw new Error(`invoice token TTL too short: ${payload.exp - now}`);
  }
});
