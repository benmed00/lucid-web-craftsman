import { describe, expect, it } from 'vitest';

import { looksLikeOrderUuid, ORDER_UUID_PATTERN } from './orderUuid';

describe('orderUuid', () => {
  it('ORDER_UUID_PATTERN matches canonical v4-style ids', () => {
    expect(
      ORDER_UUID_PATTERN.test('11111111-2222-3333-4444-555555555555')
    ).toBe(true);
    expect(ORDER_UUID_PATTERN.test('not-a-uuid')).toBe(false);
  });

  it('looksLikeOrderUuid rejects empty, cs_*, and non-hex', () => {
    expect(looksLikeOrderUuid('')).toBe(false);
    expect(looksLikeOrderUuid('cs_test_123')).toBe(false);
    expect(looksLikeOrderUuid('  11111111-2222-3333-4444-555555555555  ')).toBe(
      true
    );
  });
});
