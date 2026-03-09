

# Full Architecture & Data Flow Audit

## 1. Application Bootstrap Sequence

The app initializes in `main.tsx` in this order:

1. **i18n** initialized (synchronous import)
2. **Error suppression** set up for production
3. **Zustand stores** initialized synchronously: Cart, Currency, Theme, Language
4. **Supabase warmup** fires async (lightweight `products.select('id').limit(1)`)
5. **React tree** rendered: `StrictMode > HelmetProvider > App`
6. **Deferred** (double-rAF): performance optimizations, resource hints
7. **Further deferred** (2s timeout): Service Worker registration, business rules

**Finding**: The warmup query and product prefetch (`requestIdleCallback` in `App.tsx`) both hit Supabase early. This means there are **2 Supabase product queries firing within the first few seconds** -- one warmup (`select id limit 1`) and one prefetch (`getProductsWithTranslations`). This is intentional but worth noting: if the user lands on `/products`, a **third** identical query fires from `useProductsWithTranslations`. React Query deduplicates it thanks to matching `queryKey: ['products', locale]`, so no wasted network call.

## 2. Component Hierarchy & Relationships

```text
App.tsx
├── ErrorBoundary
├── QueryClientProvider (React Query)
│   ├── OfflineManager (lazy, SW-based offline detection)
│   ├── AuthProvider (React Context)
│   │   ├── TooltipProvider
│   │   ├── BrowserRouter
│   │   │   ├── NavigateRegistrar (sets global navigate ref)
│   │   │   ├── ScrollRestoration (scroll to top on route change)
│   │   │   ├── MaintenanceWrapper
│   │   │   │   ├── Navigation (persistent header, NOT shown on admin routes)
│   │   │   │   ├── PushNotificationManager (lazy)
│   │   │   │   ├── PWAInstallPrompt (lazy)
│   │   │   │   └── Routes (all pages)
│   │   │   │       ├── Index (eagerly loaded)
│   │   │   │       ├── Products (lazy)
│   │   │   │       ├── ProductDetail (lazy)
│   │   │   │       ├── Checkout (lazy)
│   │   │   │       ├── Admin/* (lazy, wrapped in ProtectedAdminRoute)
│   │   │   │       └── ... 20+ other lazy routes
│   │   ├── Sonner (toast notifications)
│   │   ├── Toaster (shadcn toasts)
│   │   └── ReactQueryDevtools (dev only)
```

## 3. State Management & Cross-Component Communication

There are **three state layers**, each serving a distinct purpose:

| Layer | Technology | Scope | What it manages |
|-------|-----------|-------|----------------|
| **Global stores** | Zustand (5 stores) | App-wide, persisted to localStorage | Cart, Wishlist, Currency, Theme, Language |
| **Server state** | React Query | Per-query, cached | Products, blog posts, orders, stock, reviews |
| **Auth state** | React Context | App-wide | User session, profile, auth methods |

### Communication patterns between components:

- **Navigation ↔ Cart**: Navigation reads `useCartUI()` which reads `useCart()` (Zustand selector). Cart badge updates instantly when any page calls `addItem`.
- **Products → Cart**: `useProductsPage` hook calls `addItem` from `useCart()`. Cart store debounces save to Supabase (500ms).
- **Products → ProductDetail**: No direct communication. URL param (`/products/:id`) triggers a fresh `useProductWithTranslation(id)` query. React Query may serve from cache if the product was already fetched in the list.
- **Checkout → Cart**: `useCheckoutPage` reads `useCart()` for cart items. Cart is **not cleared** until payment success.
- **Auth → Wishlist/Cart**: AuthContext's `onAuthStateChange` triggers `initializeWishlistStore(userId)` and cart store's own auth listener merges local + Supabase cart.
- **Cross-tab sync**: Both Cart and Auth use `BroadcastChannel` to sync state across browser tabs.

### Potential issues found:

1. **Cart store's `useCart()` hook** is not shown in the codebase snippet but is exported from `stores/index.ts` -- it likely uses selectors. The `cartTotal` in `useProductsPage` manually computes `cart.items.reduce(...)` which accesses `cart.items` directly. If `cart.items` contains items without loaded `product` data (during rehydration), this will throw. The `selectCartItems` selector filters these out, but `useProductsPage` doesn't use it.

2. **Index and Products both call `useProductsWithTranslations()`** -- React Query deduplicates, so navigating from Index to Products serves cached data. Good.

3. **No shared product detail cache warming**: When viewing a product list, individual product data is not pre-cached for `/products/:id`. The detail page makes a separate query with a different key (`['product', id, locale]` vs `['products', locale]`). This means clicking a product always triggers a new Supabase call.

## 4. Page Load & Data Fetching Timeline

### Homepage (`/`)
1. `Index` component renders immediately (not lazy-loaded)
2. `useProductsWithTranslations()` fires -- likely already cached from `App.tsx` prefetch
3. Below-fold sections (ProductShowcase, Artisans, Testimonials, InstagramFeed, Newsletter) are lazy-loaded with Suspense + Skeleton fallbacks
4. `HeroImage` component fetches hero image from Supabase storage

### Products page (`/products`)
1. Chunk loaded (lazy), Suspense shows `PageLoadingFallback` skeleton
2. `useProductsPage` hook initializes:
   - `useProductsWithTranslations()` -- products from React Query cache or Supabase
   - `useBatchStock()` -- batch stock levels query
   - `useAdvancedProductFilters()` -- client-side filtering with debounce
   - `useInfiniteScroll()` -- virtual pagination (8 mobile / 16 desktop items visible)
   - `useSafetyTimeout(loading, 12s)` -- forces render if data takes too long
3. If loading exceeds 5s, slow loading indicator appears
4. If loading exceeds 12s, page force-renders with whatever data is available

### Checkout (`/checkout`)
1. Chunk loaded (lazy)
2. `useCheckoutPage` initializes:
   - Reads cart from Zustand
   - `useCheckoutSession()` -- creates/restores checkout session in Supabase
   - `useCheckoutFormPersistence()` -- restores form data from localStorage
   - `useLazyStripe()` -- defers Stripe.js loading until payment step
   - `useBusinessRules()` -- fetches shipping/promo rules
   - `useGuestSession()` -- generates guest ID for anonymous checkout
3. Form state restoration shows skeleton until `hasRestoredState` is true
4. Promo code validation hits Supabase RPC

## 5. Network Activity Profile

On a typical page load, these network requests fire:

| Request | Trigger | Caching |
|---------|---------|---------|
| `GET /rest/v1/products?select=*` | Supabase warmup + prefetch + page query (deduplicated to 1) | React Query 5min stale, SW network-first for offline |
| `GET /rest/v1/product_translations?...` | Part of `getProductsWithTranslations` | React Query 5min |
| `GET /rest/v1/products?select=id,stock_quantity` | `useBatchStock` on Products page | React Query |
| `GET /auth/v1/session` | AuthContext init | Not cached |
| `GET /auth/v1/user` | Background JWT validation | Not cached |
| `GET /rest/v1/company_settings` | Business rules, maintenance mode | React Query |
| `GET /rest/v1/hero_images` | HeroImage component | React Query |
| `GET api.frankfurter.app/latest` | Currency store init | Zustand persisted |
| `GET /storage/v1/.../hero-images/...` | Hero image display | SW network-first |

**Service Worker caching strategy**:
- Static assets (JS/CSS/fonts with hashes): cache-first
- Images: cache-first (except hero images: network-first)
- HTML navigation: network-only (never cached)
- Supabase product REST API: network-first (for offline catalog)
- Supabase auth/functions: bypassed entirely
- Stripe: bypassed entirely

## 6. Refresh & State Persistence Behavior

| Action | Behavior |
|--------|----------|
| **Browser refresh** | Cart restored from Zustand `persist` (localStorage). Auth restored from Supabase local session. Products re-fetched (React Query cache cleared on full reload). |
| **Tab switch & return** | `refetchOnWindowFocus: false` globally -- no re-fetches. Good for performance, but means stale stock data. |
| **Language change** | New React Query key `['products', newLocale]` triggers fresh fetch. `placeholderData: previousData` shows old locale data during transition. |
| **Sign in** | Cart merges local + Supabase items. Wishlist loads from Supabase. Profile loaded. |
| **Sign out** | Cart cleared. Wishlist cleared. React Query cache purged. SW caches deleted. |
| **Offline → Online** | Cart offline queue replayed. Toast notification shown. |
| **Pull-to-refresh** (mobile) | `PullToRefresh` component calls `refetch()` on products. |

## 7. Key Findings & Recommendations

### What works well
- Zustand + React Query separation is clean -- UI state vs server state
- Cross-tab sync via BroadcastChannel for both auth and cart
- Offline queue for cart operations is well-designed
- Safety timeouts prevent permanent loading states
- Lazy loading is thorough -- only Index page and Navigation are eager

### Issues to address

1. **Products → ProductDetail cache miss**: Each product detail page makes a fresh Supabase call even though all product data was already fetched in the list. Consider populating individual product cache entries from the list query.

2. **`cartTotal` in `useProductsPage`** accesses `cart.items` directly without filtering for valid products -- could crash during rehydration if product data hasn't loaded yet.

3. **Navigation.tsx is 755 lines** -- one of the largest components, not yet split. It handles desktop nav, mobile menu, search, auth state display, and settings.

4. **AuthContext 4s timeout warning** fires on every page load (visible in console logs). The `getSession()` call from localStorage is fast, but the safety timer starts before it resolves. The timer should be cleared sooner.

5. **Double product prefetch**: `main.tsx` warmup query + `App.tsx` idle prefetch both fire early. The warmup could be removed since the prefetch already warms the connection pool.

6. **No stock data refresh**: `refetchOnWindowFocus: false` means stock quantities shown to users may be stale for the duration of the 5-minute stale time. For a store with limited inventory, this could lead to cart failures.

7. **Checkout form persistence** uses localStorage directly -- if a user starts checkout on one device and switches, their form data doesn't follow. The `checkout_sessions` Supabase table exists but form field persistence is local-only.

