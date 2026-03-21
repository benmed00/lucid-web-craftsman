import { assertEquals } from '@std/assert';

import { CHECKOUT_VALIDATION_ERROR_PREFIX } from '../constants.ts';
import {
  errorConstructorLabel,
  isClientFacingValidationError,
  messageFromUnknownError,
} from './errors.ts';

Deno.test('messageFromUnknownError: Error, string, unknown', () => {
  assertEquals(messageFromUnknownError(new Error('x')), 'x');
  assertEquals(messageFromUnknownError('y'), 'y');
  assertEquals(messageFromUnknownError(123), 'Unknown error');
});

Deno.test('errorConstructorLabel', () => {
  assertEquals(errorConstructorLabel(new TypeError('t')), 'TypeError');
  assertEquals(errorConstructorLabel('s'), 'string');
});

Deno.test('isClientFacingValidationError: Zod prefix', () => {
  assertEquals(
    isClientFacingValidationError(
      `${CHECKOUT_VALIDATION_ERROR_PREFIX} items: required`
    ),
    true
  );
});

Deno.test('isClientFacingValidationError: French business messages', () => {
  assertEquals(isClientFacingValidationError('Produit introuvable: 9'), true);
  assertEquals(isClientFacingValidationError('Produit indisponible: X'), true);
  assertEquals(
    isClientFacingValidationError('Stock insuffisant pour X: 1 restant(s)'),
    true
  );
});

Deno.test('isClientFacingValidationError: Invalid / No items', () => {
  assertEquals(isClientFacingValidationError('Invalid email format'), true);
  assertEquals(isClientFacingValidationError('No items'), true);
});

Deno.test('isClientFacingValidationError: internal errors stay false', () => {
  assertEquals(
    isClientFacingValidationError('Failed to create order: db down'),
    false
  );
});
