import { assertEquals } from '@std/assert';

import { looksLikeOrderUuid } from './order_uuid.ts';

Deno.test('looksLikeOrderUuid accepts v4-style uuid', () => {
  assertEquals(
    looksLikeOrderUuid('11111111-2222-3333-4444-555555555555'),
    true
  );
});

Deno.test('looksLikeOrderUuid rejects cs_* and garbage', () => {
  assertEquals(looksLikeOrderUuid('cs_test_abc'), false);
  assertEquals(looksLikeOrderUuid('not-uuid'), false);
});
