/**
 * Tracking Pixel Infrastructure
 *
 * Supports Meta (Facebook) Pixel and TikTok Pixel.
 * Pixel IDs are read from environment variables:
 *   - VITE_META_PIXEL_ID
 *   - VITE_TIKTOK_PIXEL_ID
 *
 * If no ID is set, the pixel is silently disabled (no errors).
 */

// ─── Types ───────────────────────────────────────────────────────
interface PixelConfig {
  metaPixelId: string | undefined;
  tiktokPixelId: string | undefined;
}

// ─── Config ──────────────────────────────────────────────────────
const config: PixelConfig = {
  metaPixelId: import.meta.env.VITE_META_PIXEL_ID,
  tiktokPixelId: import.meta.env.VITE_TIKTOK_PIXEL_ID,
};

// ─── Init Scripts ────────────────────────────────────────────────
let metaInitialized = false;
let tiktokInitialized = false;

export function initMetaPixel(): void {
  if (metaInitialized || !config.metaPixelId) return;
  metaInitialized = true;

  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    'script',
    'https://connect.facebook.net/en_US/fbevents.js'
  );
  /* eslint-enable */

  window.fbq('init', config.metaPixelId);
  window.fbq('track', 'PageView');
}

export function initTikTokPixel(): void {
  if (tiktokInitialized || !config.tiktokPixelId) return;
  tiktokInitialized = true;

  /* eslint-disable */
  (function (w: any, d: any, t: any) {
    w.TiktokAnalyticsObject = t;
    const ttq = (w[t] = w[t] || []);
    ttq.methods = [
      'page',
      'track',
      'identify',
      'instances',
      'debug',
      'on',
      'off',
      'once',
      'ready',
      'alias',
      'group',
      'enableCookie',
      'disableCookie',
    ];
    ttq.setAndDefer = function (t: any, e: any) {
      t[e] = function () {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i]);
    }
    ttq.instance = function (t: any) {
      const e = ttq._i[t] || [];
      for (let n = 0; n < ttq.methods.length; n++) {
        ttq.setAndDefer(e, ttq.methods[n]);
      }
      return e;
    };
    ttq.load = function (e: any, n?: any) {
      const i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = i;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      const o = d.createElement('script');
      o.type = 'text/javascript';
      o.async = true;
      o.src = i + '?sdkid=' + e + '&lib=' + t;
      const a = d.getElementsByTagName('script')[0];
      a.parentNode?.insertBefore(o, a);
    };
    ttq.load(config.tiktokPixelId);
    ttq.page();
  })(window, document, 'ttq');
  /* eslint-enable */
}

/** Initialize all configured pixels. Call once on app mount. */
export function initPixels(): void {
  // Defer pixel loading to not block main thread
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(
      () => {
        initMetaPixel();
        initTikTokPixel();
      },
      { timeout: 3000 }
    );
  } else {
    setTimeout(() => {
      initMetaPixel();
      initTikTokPixel();
    }, 2000);
  }
}

// ─── E-Commerce Events ──────────────────────────────────────────

/** Track page view (called on route change) */
export function trackPageView(): void {
  if (config.metaPixelId && window.fbq) {
    window.fbq('track', 'PageView');
  }
  if (config.tiktokPixelId && window.ttq) {
    window.ttq.page();
  }
}

/** Track product view */
export function trackViewContent(params: {
  productId: string | number;
  productName: string;
  price: number;
  currency?: string;
}): void {
  const { productId, productName, price, currency = 'EUR' } = params;

  if (config.metaPixelId && window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_ids: [String(productId)],
      content_name: productName,
      content_type: 'product',
      value: price,
      currency,
    });
  }
  if (config.tiktokPixelId && window.ttq) {
    window.ttq.track('ViewContent', {
      content_id: String(productId),
      content_name: productName,
      content_type: 'product',
      value: price,
      currency,
    });
  }
}

/** Track add to cart */
export function trackAddToCart(params: {
  productId: string | number;
  productName: string;
  price: number;
  quantity: number;
  currency?: string;
}): void {
  const { productId, productName, price, quantity, currency = 'EUR' } = params;

  if (config.metaPixelId && window.fbq) {
    window.fbq('track', 'AddToCart', {
      content_ids: [String(productId)],
      content_name: productName,
      content_type: 'product',
      value: price * quantity,
      currency,
      num_items: quantity,
    });
  }
  if (config.tiktokPixelId && window.ttq) {
    window.ttq.track('AddToCart', {
      content_id: String(productId),
      content_name: productName,
      content_type: 'product',
      value: price * quantity,
      currency,
      quantity,
    });
  }
}

/** Track checkout initiation */
export function trackInitiateCheckout(params: {
  value: number;
  numItems: number;
  currency?: string;
}): void {
  const { value, numItems, currency = 'EUR' } = params;

  if (config.metaPixelId && window.fbq) {
    window.fbq('track', 'InitiateCheckout', {
      value,
      currency,
      num_items: numItems,
    });
  }
  if (config.tiktokPixelId && window.ttq) {
    window.ttq.track('InitiateCheckout', {
      value,
      currency,
      quantity: numItems,
    });
  }
}

/** Track successful purchase */
export function trackPurchase(params: {
  orderId: string;
  value: number;
  currency?: string;
  numItems: number;
}): void {
  const { value, currency = 'EUR', numItems } = params;

  if (config.metaPixelId && window.fbq) {
    window.fbq('track', 'Purchase', {
      value,
      currency,
      num_items: numItems,
      content_type: 'product',
    });
  }
  if (config.tiktokPixelId && window.ttq) {
    window.ttq.track('CompletePayment', {
      value,
      currency,
      quantity: numItems,
      content_type: 'product',
    });
  }
}

// ─── Global type augmentation ────────────────────────────────────
declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    ttq: any;
  }
}
