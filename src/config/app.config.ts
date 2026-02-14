/**
 * Centralized Application Configuration
 * Single source of truth for all app settings, CSP, and environment config
 */

// Environment detection
export const ENV = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const;

// API endpoints and external services
export const EXTERNAL_SERVICES = {
  supabase: {
    url: 'https://xcvlijchkmhjonhfildm.supabase.co',
    wsUrl: 'wss://xcvlijchkmhjonhfildm.supabase.co',
  },
  stripe: {
    js: 'https://js.stripe.com',
    api: 'https://api.stripe.com',
    hooks: 'https://hooks.stripe.com',
    network: 'https://m.stripe.network',
  },
  currency: {
    frankfurter: 'https://api.frankfurter.app',
    exchangeRate: 'https://api.exchangerate.host',
  },
  fonts: {
    google: 'https://fonts.googleapis.com',
    gstatic: 'https://fonts.gstatic.com',
  },
  analytics: {
    sentry: 'https://*.sentry.io',
  },
  lovable: {
    cdn: 'https://cdn.gpteng.co',
    app: 'https://*.lovable.app',
    project: 'https://*.lovableproject.com',
    main: 'https://lovable.dev',
  },
} as const;

// Content Security Policy configuration
export const CSP_CONFIG = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    EXTERNAL_SERVICES.stripe.js,
    EXTERNAL_SERVICES.lovable.cdn,
    EXTERNAL_SERVICES.stripe.network,
    'blob:',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    EXTERNAL_SERVICES.fonts.google,
  ],
  'img-src': ["'self'", 'data:', 'blob:', 'https:', 'http:'],
  'font-src': [
    "'self'",
    EXTERNAL_SERVICES.fonts.gstatic,
    'data:',
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    EXTERNAL_SERVICES.stripe.api,
    EXTERNAL_SERVICES.stripe.js,
    EXTERNAL_SERVICES.stripe.network,
    EXTERNAL_SERVICES.analytics.sentry,
    EXTERNAL_SERVICES.lovable.cdn,
    EXTERNAL_SERVICES.lovable.app,
    EXTERNAL_SERVICES.lovable.project,
    EXTERNAL_SERVICES.currency.exchangeRate,
    EXTERNAL_SERVICES.currency.frankfurter,
  ],
  'frame-src': [
    "'self'",
    EXTERNAL_SERVICES.stripe.js,
    EXTERNAL_SERVICES.stripe.hooks,
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': [
    "'self'",
    EXTERNAL_SERVICES.lovable.app,
    EXTERNAL_SERVICES.lovable.project,
  ],
  'manifest-src': ["'self'"],
  'upgrade-insecure-requests': [],
} as const;

// Generate CSP header string
export function generateCSPString(): string {
  return Object.entries(CSP_CONFIG)
    .map(([directive, values]) => {
      if (values.length === 0) return directive;
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}

// React Query configuration
export const QUERY_CONFIG = {
  staleTime: 1000 * 60 * 5, // 5 minutes
  gcTime: 1000 * 60 * 10, // 10 minutes
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: true,
  networkMode: 'offlineFirst' as const,
} as const;

// Cart and business rules defaults
export const CART_DEFAULTS = {
  maxQuantityPerItem: 10,
  maxProductTypes: 20,
  highValueThreshold: 1000,
  debounceMs: 500,
} as const;

// Performance thresholds
export const PERFORMANCE_CONFIG = {
  lazyLoadDelay: 1000,
  idleCallbackTimeout: 2000,
  serviceWorkerDelay: 1000,
  inputDebounceMs: 150,
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  staticAssets: 'public, max-age=31536000, immutable',
  html: 'no-cache, no-store, must-revalidate',
  serviceWorker: 'no-cache, no-store, must-revalidate',
  apiResponseTTL: 5 * 60 * 1000, // 5 minutes in ms
} as const;

// Feature flags
export const FEATURES = {
  enablePWA: true,
  enablePushNotifications: true,
  enableOfflineMode: true,
  enableDevTools: ENV.isDev,
  enablePerformanceMonitoring: true,
} as const;

// Unified app configuration export
export const APP_CONFIG = {
  env: ENV,
  services: EXTERNAL_SERVICES,
  csp: CSP_CONFIG,
  query: QUERY_CONFIG,
  cart: CART_DEFAULTS,
  performance: PERFORMANCE_CONFIG,
  cache: CACHE_CONFIG,
  features: FEATURES,
} as const;
