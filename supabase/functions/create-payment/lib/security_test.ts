import { assertEquals } from '@std/assert';

import { isValidEmail, sanitizeString, verifyCsrfToken } from './security.ts';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.test('sanitizeString: escapes and truncates', () => {
  assertEquals(sanitizeString(null), '');
  assertEquals(sanitizeString('<script>'), '&lt;script&gt;');
  const long = 'a'.repeat(600);
  assertEquals(sanitizeString(long).length, 500);
});

Deno.test('isValidEmail', () => {
  assertEquals(isValidEmail('a@b.co'), true);
  assertEquals(isValidEmail('not-an-email'), false);
  assertEquals(isValidEmail(`${'a'.repeat(250)}@b.co`), false);
});

Deno.test('verifyCsrfToken: false when headers incomplete', async () => {
  assertEquals(await verifyCsrfToken('', 'n', 'h'), false);
  assertEquals(await verifyCsrfToken('t', '', 'h'), false);
});

Deno.test('verifyCsrfToken: true when hash matches SHA-256(token:nonce)', async () => {
  const token = 'csrf';
  const nonce = 'nonce';
  const hash = await sha256Hex(`${token}:${nonce}`);
  assertEquals(await verifyCsrfToken(token, nonce, hash), true);
  assertEquals(await verifyCsrfToken(token, nonce, 'deadbeef'), false);
});
