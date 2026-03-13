# Rif Raw Straw — Platform Analysis (Deploy Preview #4)

**Deploy Preview URL**: https://deploy-preview-4--benyakoub.netlify.app/  
**Analysis Date**: 2026-02-24  
**Scope**: Full e-commerce platform audit for enterprise E2E test design

---

## 1. Executive Summary

Rif Raw Straw is a **Berber artisan e-commerce platform** (Rif Raw Straw – Authentic Berber Craftsmanship) selling handmade bags and hats. The site is a **Vite + React SPA** with Supabase backend, Stripe payments, PWA support, and Netlify deployment.

---

## 2. URL & Route Inventory

### 2.1 Public Routes

| Path | Page | Purpose |
|------|------|---------|
| `/` | Index | Homepage, hero, product showcase, testimonials, newsletter |
| `/products` | Products | Product listing with filters, search |
| `/products/:id` | ProductDetail | Single product, add to cart, reviews |
| `/shop` | Redirect | Redirects to `/products` |
| `/blog` | Blog | Blog listing |
| `/blog/:id` | BlogPost | Single blog post |
| `/contact` | Contact | Contact form, map, company info |
| `/about` | About | Company story |
| `/story` | Story | Brand story |
| `/cart` | Cart | Shopping cart, quantity controls, shipping calculator |
| `/checkout` | Checkout | Multi-step checkout (personal → shipping → payment) |
| `/payment-success` | PaymentSuccess | Post-payment confirmation |
| `/auth` | Auth | Login, signup, OTP flow |
| `/profile` | EnhancedProfile | User profile |
| `/enhanced-profile` | EnhancedProfile | Alias for profile |
| `/orders` | OrderHistory | Order history (authenticated) |
| `/wishlist` | Wishlist | Wishlist (authenticated) |
| `/shipping` | Shipping | Shipping policy |
| `/returns` | Returns | Returns policy |
| `/faq` | FAQ | FAQ accordion |
| `/cgv` | CGV | Terms & conditions |
| `/terms` | Terms | Legal terms |
| `/terms-of-service` | TermsOfService | Terms of service |
| `*` | NotFound | 404 page |

### 2.2 Admin Routes (Protected)

| Path | Page |
|------|------|
| `/admin/login` | AdminLogin |
| `/admin` | AdminDashboard (redirects to dashboard) |
| `/admin/dashboard` | AdminDashboard |
| `/admin/products` | AdminProducts |
| `/admin/catalog` | AdminProductCatalog |
| `/admin/blog` | AdminBlog |
| `/admin/hero-image` | AdminHeroImage |
| `/admin/inventory` | AdminInventory |
| `/admin/orders` | AdminOrders |
| `/admin/orders-enhanced` | AdminOrdersEnhanced |
| `/admin/customers` | AdminCustomers |
| `/admin/marketing` | AdminMarketing |
| `/admin/promo-codes` | AdminPromoCodes |
| `/admin/analytics` | AdminAnalytics |
| `/admin/reviews` | AdminReviews |
| `/admin/translations` | AdminTranslations |
| `/admin/tags` | AdminTags |
| `/admin/error-reports` | AdminErrorReports |
| `/admin/email-testing` | AdminEmailTesting |
| `/admin/api-status` | AdminApiStatus |
| `/admin/settings` | AdminSettings |

---

## 3. Button & CTA Inventory

### 3.1 Homepage (Index)

| Element | ID/Selector | Action |
|---------|-------------|--------|
| Discover Collection | `#hero-discover-collection` | Navigate to `/products` |
| Our Story | `#hero-our-story` | Navigate to `/blog` |
| View all products | `#collection-link-desktop`, `#mobile-view-all-products` | Navigate to `/products` |
| Newsletter Subscribe | `#newsletter-email`, `#newsletter-consent` | Submit newsletter |

### 3.2 Navigation (Header)

| Element | ARIA/ID | Action |
|---------|---------|--------|
| Skip to content | `href="#main-content"` | Focus main content |
| Logo | Link to `/` | Home |
| Home | Link to `/` | Home |
| Boutique/Shop | Link to `/products` | Products |
| Blog | Link to `/blog` | Blog |
| Contact | Link to `/contact` | Contact |
| Search | Form submit | Navigate to `/products?q=...` |
| Cart | Link to `/cart` | Cart |
| Login | Link to `/auth` | Auth |
| Profile | Link to `/profile` | Profile (auth) |
| Orders | Link to `/orders` | Orders (auth) |
| Wishlist | Link to `/wishlist` | Wishlist (auth) |
| Sign out | Button | Logout |
| Mobile menu toggle | `[aria-label="Ouvrir le menu"]` | Open mobile menu |
| Mobile menu close | `[aria-label="Fermer le menu"]` | Close mobile menu |

### 3.3 Product Card

| Element | ID | Action |
|---------|-----|--------|
| Add to cart | `#add-to-cart-btn-{id}` | Add product to cart |
| Quick view | `#quick-view-btn-{id}` | Open quick view modal |
| Wishlist | `#wishlist-btn-{id}` | Toggle wishlist |
| Share | `#share-btn-{id}` | Native share |
| Product link | — | Navigate to `/products/:id` |

### 3.4 Product Detail

| Element | ID | Action |
|---------|-----|--------|
| Add to cart | — | Add to cart with quantity |
| Back to products | Link | Navigate to `/products` |
| Category link | Link | Navigate to `/products?category=...` |

### 3.5 Cart

| Element | ID | Action |
|---------|-----|--------|
| Empty cart shop | `#empty-cart-shop-button` | Navigate to `/products` |
| Remove item | `#cart-remove-{id}` | Remove from cart |
| Qty minus | `#cart-qty-minus-{id}` | Decrease quantity |
| Qty plus | `#cart-qty-plus-{id}` | Increase quantity |
| Shipping calculator | `#shipping-calculator-button` | Calculate shipping |
| Checkout | `#cart-checkout-button` | Navigate to `/checkout` |
| Share cart | `#cart-share-button` | Share cart |

### 3.6 Checkout

| Element | ID | Action |
|---------|-----|--------|
| Step 1: Personal info | `#firstName`, `#lastName`, `#email`, `#phone` | Fill & advance |
| Step 2: Shipping | `#address`, `#postalCode`, `#city`, `#country` | Fill & advance |
| Step 3: Payment | `#card`, `#paypal` | Select method |
| Promo code | Input + Apply button | Apply coupon |
| Pay button | — | Stripe/PayPal payment |

### 3.7 Contact Form

| Element | ID | Action |
|---------|-----|--------|
| First name | `#firstName` | Required |
| Last name | `#lastName` | Required |
| Email | `#email` | Required |
| Phone | `#phone` | Optional |
| Company | `#company` | Optional |
| Subject | `#subject` | Required (select) |
| Message | `#message` | Required (min 20 chars) |
| Submit | `#contact-form-submit` | Send message |
| Contact hero CTA | `#contact-hero-button` | Scroll to form |

### 3.8 Auth

| Element | ID | Action |
|---------|-----|--------|
| Sign in email | `#signin-email` | Email input |
| Sign in password | `#signin-password` | Password input |
| Sign up name | `#signup-name` | Full name |
| Sign up phone | `#signup-phone` | Phone |
| Sign up email | `#signup-email` | Email |
| Sign up password | `#signup-password` | Password |
| Confirm password | `#confirm-password` | Confirm |
| OTP input | `#otp` | OTP code |

### 3.9 Footer

| Element | ID | Action |
|---------|-----|--------|
| Shop | Link to `/products` | |
| Blog | Link to `/blog` | |
| Contact | Link to `/contact` | |
| About/Story | Link to `/about` | |
| Shipping | Link to `/shipping` | |
| Returns | Link to `/returns` | |
| FAQ | Link to `/faq` | |
| CGV | Link to `/cgv` | |
| Terms | Link to `/terms` | |
| Terms of Service | Link to `/terms-of-service` | |
| Newsletter email | `#newsletter-email-footer` | Footer newsletter |
| Subscribe | Button | Submit newsletter |
| Instagram/Facebook/Twitter | External links | Social |

---

## 4. Form Inventory

### 4.1 Contact Form

- **Fields**: firstName, lastName, email, phone, company, subject, message
- **Validation**: Subject min 5 chars, message min 20 chars
- **Rate limit**: 3 attempts per 10 minutes
- **CSRF**: Uses `useCsrfToken`
- **Pre-fill**: Supports `?orderId=&firstName=&lastName=&email=` for post-payment support

### 4.2 Checkout Form

- **Step 1**: firstName, lastName, email, phone, website (honeypot)
- **Step 2**: address, addressComplement, postalCode, city, country
- **Validation**: Per-country postal code (FR 5 digits, BE 4 digits, etc.)
- **Persistence**: `useCheckoutFormPersistence` (localStorage)
- **Promo**: Input + Apply, validates against Supabase

### 4.3 Newsletter (Index + Footer)

- **Fields**: email, consent checkbox
- **IDs**: `#newsletter-email`, `#newsletter-consent` (Index); `#newsletter-email-footer` (Footer)
- **Backend**: Supabase `newsletter_subscriptions` upsert

### 4.4 Auth Forms

- **Sign in**: email, password
- **Sign up**: fullName, phone, email, password, confirmPassword
- **OTP**: contact (email/phone), otp code
- **Rate limit**: 5 attempts per 15 minutes

---

## 5. DOM Structure & Nomenclature

### 5.1 Key Landmarks

| Landmark | ID/Selector | Purpose |
|----------|-------------|---------|
| Main content | `#main-content` | Primary content area |
| Header | `.header-nav-root` | Sticky header |
| Mobile menu | `#mobile-menu` | Slide-out menu (role="menu") |
| Footer | `footer` | PageFooter component |

### 5.2 Section IDs (Index)

- `#about` — Features/values section
- `#shop` — Product collection section
- `#testimonials` — Testimonials section

### 5.3 Product Card IDs

- `#product-card-{id}` — Card container
- `#product-title-{id}` — Title
- `#product-price-{id}` — Price
- `#product-stock-{id}` — Stock (sr-only)
- `#add-to-cart-btn-{id}` — Add to cart

### 5.4 Cart Item IDs

- `#cart-item-{id}` — Cart line item
- `#cart-item-details-{id}` — Item details
- `#cart-remove-{id}` — Remove button
- `#cart-qty-minus-{id}` — Decrease
- `#cart-qty-plus-{id}` — Increase

### 5.5 Filters (Products Page)

- `#filters-panel` — Filter card
- `#search-description` — Search sr-only
- `#isNew` — New filter checkbox
- Category checkboxes: `id={category}`

---

## 6. Caching & Service Worker

### 6.1 Service Worker (`public/sw.js`)

- **Static assets** (`/assets/*`): Cache-first, 1 year
- **Images**: Cache-first
- **HTML/navigation**: Network-only (never cached)
- **Supabase API/Auth**: Bypassed (no interception)
- **Stripe**: Bypassed
- **Cache versions**: `rif-static-v6`, `rif-images-v6`

### 6.2 Netlify Headers (`public/_headers`)

- **HTML** (`/`, `/*.html`): `no-cache, no-store, must-revalidate`
- **Service worker** (`/sw.js`): `no-cache, no-store, must-revalidate`
- **Assets** (`/assets/*`): `max-age=31536000, immutable`
- **Manifest** (`/manifest.json`): `max-age=86400`

### 6.3 React Query

- **staleTime**: 5 minutes
- **gcTime**: 10 minutes
- **networkMode**: `offlineFirst`

---

## 7. Redirections

| From | To | Condition |
|------|-----|-----------|
| `/shop` | `/products` | Always (Navigate replace) |
| `/products` (invalid id) | `/products` | Product not found |
| `/auth` | `/` | Already authenticated |
| `/admin` (unauthenticated) | `/admin/login` | ProtectedAdminRoute |
| `/profile` | `/auth` | Not logged in (via EnhancedProfile) |
| `/orders` | `/auth` | Not logged in |
| `/wishlist` | `/auth` | Not logged in (optional) |

---

## 8. Network Activities

### 8.1 Supabase

- Products: `rest/v1/products`
- Product translations: `rest/v1/product_translations`
- Orders: `rest/v1/orders`
- Profiles: `rest/v1/profiles`
- Newsletter: `newsletter_subscriptions` upsert
- Auth: `auth/v1/*`
- Storage: `storage/v1/object/*`

### 8.2 External

- Stripe: `js.stripe.com`, `api.stripe.com`, `hooks.stripe.com`
- Exchange rates: `api.exchangerate.host`, `api.frankfurter.app`
- Maps: (if LocationMap used)
- Images: Supabase storage, Unsplash (blog)

### 8.3 Contact Form

- POST to `EXTERNAL_SERVICES.contactForm` (API client)
- CSRF headers required

---

## 9. Loading States

- **Lazy routes**: `PageLoadingFallback` (Skeleton)
- **Products**: Skeleton cards, loading spinner
- **Blog**: Skeleton
- **Contact**: Form submit `isSubmitting`
- **Checkout**: `isProcessing`, `isValidatingPromo`
- **Auth**: `isLoading`
- **Cart**: Optimistic updates

---

## 10. Offline & PWA

- **OfflineManager**: Shows "Hors ligne" when offline
- **PWAInstallPrompt**: Install prompt
- **PushNotificationManager**: Push notifications
- **Service worker**: Caches static assets; HTML always network

---

## 11. Accessibility

- Skip to main content link
- `aria-label` on nav, buttons, icons
- `aria-current="page"` on active nav
- `role="menu"` on mobile menu
- `aria-expanded`, `aria-haspopup`, `aria-controls` on hamburger
- Form labels, `sr-only` where needed
- cypress-axe for a11y tests

---

## 12. Test Data Requirements

- **Products**: Must exist in Supabase (or mock)
- **Checkout**: Stripe test mode (or mock)
- **Auth**: Test user or mock Supabase auth
- **Contact**: API endpoint or mock
- **Newsletter**: Supabase `newsletter_subscriptions` table
