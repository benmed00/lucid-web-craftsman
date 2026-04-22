/**
 * Unit tests for the shared order-response whitelists. Consuming endpoints
 * (currently `get-order-by-token`) carry their own end-to-end needle checks;
 * these focus on the primitive `pick*` functions alone.
 */
import { assertEquals } from '@std/assert';
import {
  pickPublicOrderMetadata,
  pickPublicShippingAddress,
  PUBLIC_ORDER_METADATA_KEYS,
  PUBLIC_SHIPPING_ADDRESS_KEYS,
} from './order-response-whitelists.ts';

Deno.test('pickPublicOrderMetadata: drops every non-whitelisted key', () => {
  const raw = {
    client_ip: '203.0.113.42',
    stripe_session_id: 'cs_live_abcdef',
    correlation_id: 'corr-123',
    device_type: 'mobile',
    customer_email: 'alice@example.com',
    payment_method_label: 'Carte Visa',
  };
  assertEquals(pickPublicOrderMetadata(raw), {
    customer_email: 'alice@example.com',
    payment_method_label: 'Carte Visa',
  });
});

Deno.test(
  'pickPublicOrderMetadata: null / undefined / no matches → null',
  () => {
    assertEquals(pickPublicOrderMetadata(null), null);
    assertEquals(pickPublicOrderMetadata(undefined), null);
    assertEquals(pickPublicOrderMetadata({ client_ip: '1.2.3.4' }), null);
  }
);

Deno.test('pickPublicShippingAddress: keeps 7 UI-consumed keys', () => {
  const raw = {
    first_name: 'Alice',
    last_name: 'X',
    email: 'a@b.c',
    address_line1: '1 rue',
    address_line2: 'apt 2',
    postal_code: '75001',
    city: 'Paris',
    country: 'FR',
    phone: '+33123456789',
  };
  assertEquals(pickPublicShippingAddress(raw), {
    first_name: 'Alice',
    last_name: 'X',
    email: 'a@b.c',
    address_line1: '1 rue',
    postal_code: '75001',
    city: 'Paris',
    country: 'FR',
  });
});

Deno.test('pickPublicShippingAddress: null / undefined → null', () => {
  assertEquals(pickPublicShippingAddress(null), null);
  assertEquals(pickPublicShippingAddress(undefined), null);
});

// Stability guards — changing a whitelist is a deliberate act, not an accident.
Deno.test(
  'whitelist key sets are stable (change is a breaking contract)',
  () => {
    assertEquals(
      [...PUBLIC_ORDER_METADATA_KEYS],
      ['customer_email', 'payment_method_label']
    );
    assertEquals(
      [...PUBLIC_SHIPPING_ADDRESS_KEYS],
      [
        'first_name',
        'last_name',
        'email',
        'address_line1',
        'postal_code',
        'city',
        'country',
      ]
    );
  }
);
