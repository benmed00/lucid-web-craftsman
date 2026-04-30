import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
// Moved from `./index.ts` to `./handler.ts` when the function was split
// for testability. Importing from index.ts would now trigger `Deno.serve`
// at test-import time.
import { resolveDisplayTotalEuros } from './handler.ts';

Deno.test(
  'resolveDisplayTotalEuros prefers the pricing_snapshot minor-unit total when present',
  () => {
    // Even when the legacy `amount` column is in euros, the snapshot wins.
    assertEquals(resolveDisplayTotalEuros(149.95, 120, 15995), 159.95);
  }
);

Deno.test(
  'resolveDisplayTotalEuros converts integer cents into euros when no snapshot exists',
  () => {
    // 14995 cents with a 120 EUR items subtotal → divide by 100.
    assertEquals(resolveDisplayTotalEuros(14995, 120, null), 149.95);
  }
);

Deno.test(
  'resolveDisplayTotalEuros keeps small integer euro totals as-is',
  () => {
    // Legacy euro-denominated row: items subtotal 49 EUR, amount 49.
    // Previous 3x heuristic divided this by 100 if rawAmount > subtotal*3.
    // New rule: integer >= 100 AND rawAmount/100 >= subtotal*0.5 → cents.
    // Here rawAmount < 100, so it stays as euros.
    assertEquals(resolveDisplayTotalEuros(49, 49, null), 49);
  }
);

Deno.test(
  'resolveDisplayTotalEuros does not divide-by-100 on high shipping orders',
  () => {
    // Order with 12 EUR items + 7 EUR shipping → amount 19 (euros).
    // Old heuristic wrongly returned 0.19 because 19 > 12*3 was false here,
    // but similar shapes with small items could trip it. Verify the new
    // predicate keeps small euro values intact.
    assertEquals(resolveDisplayTotalEuros(19, 12, null), 19);
  }
);

Deno.test(
  'resolveDisplayTotalEuros falls back to items subtotal when amount is missing',
  () => {
    assertEquals(resolveDisplayTotalEuros(0, 42, null), 42);
    assertEquals(resolveDisplayTotalEuros(NaN, 42, null), 42);
  }
);
