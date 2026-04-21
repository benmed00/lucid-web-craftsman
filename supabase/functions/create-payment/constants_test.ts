import { assertEquals } from '@std/assert';

import { getValidOrigin } from './constants.ts';

Deno.test('getValidOrigin: localhost http', () => {
  assertEquals(
    getValidOrigin(
      new Request('http://x', { headers: { Origin: 'http://localhost:8080' } })
    ),
    'http://localhost:8080'
  );
});

Deno.test('getValidOrigin: 127.0.0.1 http', () => {
  assertEquals(
    getValidOrigin(
      new Request('http://x', { headers: { Origin: 'http://127.0.0.1:8080' } })
    ),
    'http://127.0.0.1:8080'
  );
});

Deno.test('getValidOrigin: private LAN IPv4 http', () => {
  assertEquals(
    getValidOrigin(
      new Request('http://x', {
        headers: { Origin: 'http://192.168.12.34:5173' },
      })
    ),
    'http://192.168.12.34:5173'
  );
});

Deno.test('getValidOrigin: 10.0.0.0/8 http', () => {
  assertEquals(
    getValidOrigin(
      new Request('http://x', { headers: { Origin: 'http://10.0.0.5:3000' } })
    ),
    'http://10.0.0.5:3000'
  );
});

Deno.test(
  'getValidOrigin: CHECKOUT_EXTRA_ORIGINS allows ngrok-style host',
  () => {
    const prev: string | undefined = Deno.env.get('CHECKOUT_EXTRA_ORIGINS');
    try {
      Deno.env.set('CHECKOUT_EXTRA_ORIGINS', 'https://abc.ngrok-free.dev');
      assertEquals(
        getValidOrigin(
          new Request('http://x', {
            headers: { Origin: 'https://abc.ngrok-free.dev' },
          })
        ),
        'https://abc.ngrok-free.dev'
      );
    } finally {
      if (prev === undefined) Deno.env.delete('CHECKOUT_EXTRA_ORIGINS');
      else Deno.env.set('CHECKOUT_EXTRA_ORIGINS', prev);
    }
  }
);

Deno.test(
  'getValidOrigin: unlisted HTTPS origin falls back to production default',
  () => {
    const fallback: string = getValidOrigin(new Request('http://noop'));
    assertEquals(
      getValidOrigin(
        new Request('http://x', {
          headers: { Origin: 'https://unknown-shop.example' },
        })
      ),
      fallback
    );
  }
);

Deno.test('getValidOrigin: Referer used when Origin missing', () => {
  assertEquals(
    getValidOrigin(
      new Request('http://x', {
        headers: { Referer: 'http://192.168.0.10:8080/checkout' },
      })
    ),
    'http://192.168.0.10:8080'
  );
});
