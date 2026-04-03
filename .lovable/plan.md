## E-Commerce Conversion Optimization Plan

### Phase 1 — Trust & Product Page (Highest ROI)
1. **Product page redesign**: Hero section with benefit-driven headline, price + CTA above fold, trust badges, scarcity indicators
2. **Trust elements**: Secure payment icons, shipping info, return policy, FAQ section
3. **Social proof**: Reviews section with seeded reviews

### Phase 2 — Checkout Hardening ✅
4. **Origin-aware redirects**: `getValidOrigin` now uses request Origin/Referer with allowlist — dev/preview URLs work correctly
5. **SEPA payment support**: Added `sepa_debit` to Stripe Checkout payment methods for French market
6. **Payment error recovery UX**: Visible error banner with reassurance ("no charge") + retry capability

### Phase 3 — UI Premium Polish
7. **Typography & spacing overhaul**: Premium minimalist feel
8. **Homepage hero**: Conversion-optimized landing section
9. **Navigation & footer**: Trust signals throughout

### Phase 4 — Performance & Tracking
10. **Image optimization**: Lazy loading, WebP
11. **Meta Pixel + TikTok Pixel integration**
12. **A/B test structure**: Variant-ready components

### Out of scope (already done or low priority)
- State management (Zustand + React Query already in place)
- Cart persistence (already implemented)
- Bundle optimization (defer to after conversion fixes)
