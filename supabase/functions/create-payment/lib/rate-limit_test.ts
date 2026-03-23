import { assertEquals } from '@std/assert';

import { MAX_PAYMENT_ATTEMPTS } from '../constants.ts';
import { checkRateLimit } from './rate-limit.ts';

Deno.test('checkRateLimit: fresh id allows and decrements remaining', () => {
  const id = crypto.randomUUID();
  const first = checkRateLimit(id);
  assertEquals(first.allowed, true);
  assertEquals(first.remaining, MAX_PAYMENT_ATTEMPTS - 1);
});

Deno.test('checkRateLimit: blocks after MAX_PAYMENT_ATTEMPTS attempts', () => {
  const id = crypto.randomUUID();
  for (let i = 0; i < MAX_PAYMENT_ATTEMPTS; i++) {
    const r = checkRateLimit(id);
    assertEquals(r.allowed, true);
  }
  const blocked = checkRateLimit(id);
  assertEquals(blocked.allowed, false);
  assertEquals(blocked.remaining, 0);
});
