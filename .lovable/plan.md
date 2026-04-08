## E-Commerce Conversion Optimization Plan

### Phase 1 — Trust & Product Page (Highest ROI)
1. **Product page redesign**: Hero section with benefit-driven headline, price + CTA above fold, trust badges, scarcity indicators
2. **Trust elements**: Secure payment icons, shipping info, return policy, FAQ section
3. **Social proof**: Reviews section with seeded reviews

### Phase 2 — Checkout Hardening ✅
4. **Origin-aware redirects**: `getValidOrigin` now uses request Origin/Referer with allowlist — dev/preview URLs work correctly
5. **SEPA payment support**: Added `sepa_debit` to Stripe Checkout payment methods for French market
6. **Payment error recovery UX**: Visible error banner with reassurance ("no charge") + retry capability

### Phase 3 — UI Premium Polish ✅
7. **Typography upgrade**: Playfair Display (headings) + Inter (body) with antialiasing, `font-sans` base
8. **Homepage hero**: Tighter tracking, bolder CTAs, refined badge styling, better spacing hierarchy
9. **Navigation**: Frosted glass effect (`backdrop-blur-md`, `bg-background/95`), softer border
10. **Premium shadow token**: Added `--shadow-premium` for elevated card effects

### Phase 4 — Performance & Tracking ✅
10. **Image optimization**: `OptimizedImage` component already handles lazy loading, IntersectionObserver, WebP fallback
11. **Meta Pixel + TikTok Pixel integration**: Environment-driven (`VITE_META_PIXEL_ID`, `VITE_TIKTOK_PIXEL_ID`), e-commerce events (ViewContent, AddToCart, InitiateCheckout, Purchase), deferred loading via `requestIdleCallback`
12. **A/B test structure**: `ABTestWrapper` component with deterministic, localStorage-persistent variant assignment and configurable traffic split

### Out of scope (already done or low priority)
- State management (Zustand + React Query already in place)
- Cart persistence (already implemented)
- Bundle optimization (defer to after conversion fixes)
