# 🚀 Production Readiness Plan - Rif Straw

**Status**: Pre-Production  
**Target Launch Date**: TBD  
**Last Updated**: October 4, 2025

---

## 📊 Executive Summary

This document outlines all required fixes and improvements before launching to production. Issues are categorized by **severity** and **urgency**.

**Current Status**:

- ✅ Navigation stability fixed
- ⚠️ 4 Supabase security warnings
- ⚠️ 11 security vulnerabilities (4 error-level, 5 warn-level, 2 info-level)
- ⚠️ Missing production configurations
- ⚠️ SEO incomplete

---

## 🔥 PHASE 1: CRITICAL SECURITY FIXES (DO FIRST)

**Timeline**: 1-2 days  
**Blocker**: Cannot launch without these fixes

### 1.1 Database Security - CRITICAL ⚠️

#### Issue #1: Loyalty Points Manipulation (ERROR)

**Risk**: Users can artificially inflate their reward points
**Impact**: Financial fraud, revenue loss

**Fix**:

```sql
-- Remove dangerous user update policy
DROP POLICY IF EXISTS "Users can update their own loyalty points" ON public.loyalty_points;

-- Create read-only policy for users
CREATE POLICY "Users can view their own loyalty points" ON public.loyalty_points
FOR SELECT USING (auth.uid() = user_id);

-- Only system functions can modify points
CREATE POLICY "System can update loyalty points" ON public.loyalty_points
FOR UPDATE USING (false); -- No direct updates allowed
```

#### Issue #2: Customer PII Exposure (ERROR)

**Risk**: Personal information accessible without proper controls
**Impact**: GDPR violations, identity theft, data breach

**Fix**:

```sql
-- Strengthen profiles RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Deny anonymous access explicitly
CREATE POLICY "Deny anonymous profile access" ON public.profiles
FOR ALL USING (auth.role() = 'authenticated');

-- Same for shipping addresses
DROP POLICY IF EXISTS "Users can view own addresses" ON public.shipping_addresses;
CREATE POLICY "Users can view own addresses" ON public.shipping_addresses
FOR SELECT USING (auth.uid() = user_id);
```

#### Issue #3: Bug Report Email Exposure (ERROR)

**Risk**: Anonymous users can view error reports by email
**Impact**: Email harvesting, vulnerability discovery

**Fix**:

```sql
-- Remove vulnerable anonymous policy
DROP POLICY IF EXISTS "Anonymous users can view their own error reports by email"
ON public.support_tickets_error_reports;

-- Require authentication
CREATE POLICY "Authenticated users view own error reports"
ON public.support_tickets_error_reports
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (user_id = auth.uid() OR public.is_admin_user(auth.uid()))
);
```

#### Issue #4: Payment Data Security (ERROR)

**Risk**: Service role policies too permissive
**Impact**: Payment fraud, PCI compliance failure

**Fix**:

```sql
-- Restrict service role payment policies
DROP POLICY IF EXISTS "Service role can insert/update payments" ON public.payments;

-- More restrictive service role policy
CREATE POLICY "Validated service payment insert" ON public.payments
FOR INSERT WITH CHECK (
  auth.uid() IS NULL -- Only service role (no user context)
  AND amount > 0
  AND currency IS NOT NULL
  AND stripe_payment_intent_id IS NOT NULL
);
```

### 1.2 Supabase Configuration Fixes - CRITICAL ⚠️

#### Go to Supabase Dashboard and fix:

1. **OTP Expiry** (Security)

   - Navigate to: Authentication → Settings → OTP Expiry
   - Change from current value to: **600 seconds (10 minutes)**
   - [Fix OTP Expiry](https://supabase.com/dashboard/project/xcvlijchkmhjonhfildm/auth/providers)

2. **Leaked Password Protection** (Security)

   - Navigate to: Authentication → Policies
   - Enable: "Check against compromised password database"
   - [Enable Password Protection](https://supabase.com/dashboard/project/xcvlijchkmhjonhfildm/auth/policies)

3. **Postgres Version Upgrade** (Security)

   - Navigate to: Database → Postgres Version
   - Upgrade to latest stable version
   - ⚠️ **Schedule maintenance window** - this requires brief downtime
   - [Upgrade Postgres](https://supabase.com/dashboard/project/xcvlijchkmhjonhfildm/settings/general)

4. **Function Search Path** (Security)
   - Already mostly handled in existing functions
   - Verify all functions have: `SET search_path TO ''` or `SET search_path TO 'public'`
   - [Review Functions](https://supabase.com/dashboard/project/xcvlijchkmhjonhfildm/sql/new)

---

## 🛡️ PHASE 2: MEDIUM SECURITY FIXES

**Timeline**: 1 day

### 2.1 Data Access Controls

#### Issue #5: Admin Data Access Too Broad (WARN)

**Risk**: All admins can view sensitive customer data
**Impact**: Insider threats, data leaks

**Fix**: Implement role-based access

```sql
-- Restrict order access to super-admins
DROP POLICY IF EXISTS "Admins can select all orders" ON public.orders;
CREATE POLICY "Super admins can select all orders" ON public.orders
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND role = 'super-admin'
  )
);

-- Same for contact messages, payments, etc.
-- Use get_masked_* functions for regular admins
```

#### Issue #6: Contact Form Rate Limiting (WARN)

**Risk**: No rate limiting at database level
**Impact**: Spam, DDoS, data harvesting

**Solution**: Already implemented `check_rate_limit` function - verify it's being used in contact form edge function.

#### Issue #7: Newsletter Email Harvesting (WARN)

**Risk**: Bulk access to subscriber emails
**Impact**: Spam lists, GDPR violations

**Fix**: Already has masked functions - ensure admin UI uses `get_newsletter_subscriptions_admin()` which logs access.

### 2.2 Audit Log Security

#### Issue #8: Audit Log Tampering (WARN)

**Risk**: Logs could be deleted, undermining security
**Impact**: Can't detect breaches, compliance failure

**Fix**:

```sql
-- Explicitly deny deletions
CREATE POLICY "Deny all audit log deletions" ON public.audit_logs
FOR DELETE USING (false);

-- Restrict inserts to system only
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (auth.uid() IS NULL); -- Service role only
```

---

## 🎯 PHASE 3: SEO & PERFORMANCE

**Timeline**: 1-2 days

### 3.1 SEO Critical Tasks

#### Meta Descriptions

Add to **every** page component:

```tsx
import { Helmet } from 'react-helmet-async';

<Helmet>
  <title>Page Title - Rif Straw Artisan Hats</title>
  <meta
    name="description"
    content="Concise description under 160 characters with target keyword"
  />
  <meta property="og:title" content="Page Title" />
  <meta property="og:description" content="Social share description" />
  <meta property="og:image" content="https://yoursite.com/share-image.jpg" />
</Helmet>;
```

**Pages needing descriptions**:

- ✅ Homepage
- ❌ Products page
- ❌ Product detail page
- ❌ About page
- ❌ Contact page
- ❌ Blog page
- ❌ Blog post page
- ❌ Cart page
- ❌ Checkout page

#### Product Schema

Add JSON-LD structured data to ProductDetail.tsx:

```tsx
<script type="application/ld+json">
  {JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.images,
    description: product.description,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: 'Rif Straw',
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'EUR',
      availability: product.stock > 0 ? 'InStock' : 'OutOfStock',
    },
  })}
</script>
```

#### Dynamic Sitemap

Create sitemap generator that includes:

- All static pages
- All products from database
- All blog posts
- Update frequency: weekly for products, daily for blog

### 3.2 Performance Optimization

#### Image Optimization

- ✅ Already using OptimizedImage component
- ⚠️ Audit all images for proper format (WebP preferred)
- ⚠️ Ensure lazy loading on images below fold
- ⚠️ Add proper width/height attributes

#### Code Splitting

- ✅ Already implemented lazy loading for pages
- ✅ Admin pages are code-split
- ✅ React Query for data caching

#### Service Worker

- ✅ Already implemented
- ⚠️ Test offline functionality
- ⚠️ Verify cache versioning strategy

---

## 📝 PHASE 4: CONTENT & COPY AUDIT

**Timeline**: 2-3 days  
**Per Custom Knowledge Guidelines**

### 4.1 Product Pages Audit

#### Required Elements (Per Custom Knowledge):

For **every** product:

- [ ] Short product title (brand + style + material)
- [ ] 1-2 sentence hero line (craft + origin)
- [ ] Bullet list: materials, dimensions, fit, production time
- [ ] Care instructions (exact steps: cleaning, storage)
- [ ] Artisan note: who made it or technique
- [ ] Production time (e.g., "handmade in 7–10 days")
- [ ] SKU visible
- [ ] Shipping: estimated delivery + countries
- [ ] Returns: clear policy summary

#### Brand Voice Check:

- [ ] Warm, respectful, premium-craft tone
- [ ] Short sentences
- [ ] Concrete details
- [ ] Human story present
- [ ] NO exoticizing language
- [ ] NO cultural appropriation
- [ ] Artisan credited (name or collective)

### 4.2 Image Standards

#### Product Photography:

- [ ] Natural lighting
- [ ] Minimal props
- [ ] Two contexts: product-only + lifestyle
- [ ] Close-ups of weave/stitches
- [ ] 3-4 angles minimum
- [ ] Consistent aspect ratio (4:5)

#### Alt Text:

Format: "Hand-woven straw fedora — natural — crafted by [artisan/collective]"

- [ ] Describes product
- [ ] Includes material
- [ ] Includes color
- [ ] Credits artisan

---

## ✅ PHASE 5: TESTING & QA

**Timeline**: 2 days

### 5.1 Functional Testing

#### Complete User Journeys:

- [ ] Browse products → Add to cart → Checkout → Payment → Success
- [ ] Guest checkout flow
- [ ] User signup flow
- [ ] User login flow
- [ ] Password reset flow
- [ ] Profile update
- [ ] Address management
- [ ] Order history view
- [ ] Product review submission
- [ ] Newsletter signup
- [ ] Contact form submission

#### Form Validation:

- [ ] All forms have client-side validation
- [ ] Error messages are clear and helpful
- [ ] Success messages appear
- [ ] Loading states work correctly

#### Edge Cases:

- [ ] Out of stock products
- [ ] Empty cart behavior
- [ ] Invalid coupon codes
- [ ] Payment failures
- [ ] Network errors

### 5.2 Cross-Browser Testing

Test on:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### 5.3 Responsive Testing

Test breakpoints:

- [ ] Mobile (320px-640px)
- [ ] Tablet (641px-1024px)
- [ ] Desktop (1025px+)
- [ ] Large desktop (1440px+)

### 5.4 Performance Testing

#### Lighthouse Audit Targets:

- [ ] Performance: 90+
- [ ] Accessibility: 95+
- [ ] Best Practices: 95+
- [ ] SEO: 95+

#### Core Web Vitals:

- [ ] LCP (Largest Contentful Paint): < 2.5s
- [ ] FID (First Input Delay): < 100ms
- [ ] CLS (Cumulative Layout Shift): < 0.1

### 5.5 Accessibility Testing

- [ ] Keyboard navigation works on all pages
- [ ] Screen reader compatibility (NVDA/JAWS)
- [ ] Color contrast WCAG AA compliant
- [ ] Focus indicators visible
- [ ] ARIA labels present and correct
- [ ] Form labels associated properly
- [ ] Skip navigation link works

---

## 🔐 PHASE 6: LEGAL & COMPLIANCE

**Timeline**: 1 day

### 6.1 GDPR Compliance

#### Cookie Consent:

- [ ] Implement cookie consent banner
- [ ] Categories: Essential, Analytics, Marketing
- [ ] User can reject non-essential
- [ ] Consent stored and logged
- [ ] Opt-out mechanism

#### Privacy Policy:

- [ ] Data collected clearly listed
- [ ] Purpose of data collection explained
- [ ] Third parties disclosed (Supabase, Stripe, etc.)
- [ ] User rights explained (access, deletion, portability)
- [ ] Contact information for data controller
- [ ] Data retention periods specified

#### Data Subject Rights:

- [ ] Implement data export functionality
- [ ] Implement account deletion
- [ ] Process for data access requests

### 6.2 E-commerce Legal

#### Terms & Conditions:

- ✅ Already exists
- [ ] Review for completeness
- [ ] Update with actual business details

#### Return Policy:

- ✅ Already exists
- [ ] Verify matches actual process
- [ ] Timeframes clearly stated

#### Shipping Policy:

- ✅ Already exists
- [ ] Verify countries served
- [ ] Update delivery estimates

#### Customs Information:

- [ ] Add international customs notice
- [ ] Clarify customer responsibilities
- [ ] List prohibited countries

---

## 📊 PHASE 7: MONITORING & ANALYTICS

**Timeline**: 1 day

### 7.1 Analytics Setup

#### Google Analytics 4:

- [ ] Install GA4
- [ ] Configure enhanced e-commerce
- [ ] Set up conversion goals
- [ ] Enable user ID tracking (authenticated)

#### Events to Track:

- [ ] Product views
- [ ] Add to cart
- [ ] Remove from cart
- [ ] Begin checkout
- [ ] Purchase
- [ ] Newsletter signup
- [ ] Contact form submission

### 7.2 Error Monitoring

#### Sentry Setup:

- [ ] Install Sentry SDK
- [ ] Configure error reporting
- [ ] Set up performance monitoring
- [ ] Configure user feedback

### 7.3 Uptime Monitoring

#### Tools to Configure:

- [ ] Uptime Robot or Pingdom
- [ ] Monitor: Homepage, API endpoints, Checkout
- [ ] Alert channels: Email, SMS for critical

### 7.4 Supabase Monitoring

#### Enable:

- [ ] Database performance insights
- [ ] API usage tracking
- [ ] Storage usage monitoring
- [ ] Function execution logs
- [ ] Alert thresholds configured

---

## 💾 PHASE 8: BACKUP & DISASTER RECOVERY

**Timeline**: 0.5 day

### 8.1 Database Backups

#### Supabase:

- [ ] Verify automatic backups enabled
- [ ] Set backup retention: 30 days minimum
- [ ] Test restore procedure
- [ ] Document restore process

#### Manual Backup:

- [ ] Create pre-launch database snapshot
- [ ] Export to secure location
- [ ] Test import procedure

### 8.2 Code Backups

- ✅ GitHub repository active
- [ ] Verify all branches pushed
- [ ] Tag release version
- [ ] Document deployment procedure

### 8.3 Asset Backups

- [ ] Backup product images
- [ ] Backup blog images
- [ ] Store in separate S3 bucket or service

---

## 🚀 PHASE 9: DEPLOYMENT CHECKLIST

**Timeline**: 0.5 day

### 9.1 Pre-Deploy

- [ ] All critical security fixes applied
- [ ] All tests passing
- [ ] Performance audit completed
- [ ] Content audit completed
- [ ] Legal pages reviewed
- [ ] Backup created
- [ ] Deployment procedure documented

### 9.2 DNS & Domain

- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] DNS propagation verified
- [ ] Redirect HTTP → HTTPS
- [ ] WWW vs non-WWW decided

### 9.3 Environment Configuration

- [ ] Production environment variables set
- [ ] API keys rotated (new production keys)
- [ ] Stripe in production mode
- [ ] Supabase production URL configured
- [ ] Email service configured (Resend)

### 9.4 Deploy

- [ ] Deploy to production
- [ ] Smoke test critical paths
- [ ] Monitor error logs for 1 hour
- [ ] Check analytics tracking
- [ ] Test payment flow with real card (small amount)

### 9.5 Post-Deploy

- [ ] Verify SEO: robots.txt accessible
- [ ] Verify SEO: sitemap.xml accessible
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Test from multiple devices/networks
- [ ] Monitor performance for 24 hours

---

## 📋 QUICK REFERENCE CHECKLISTS

### Critical Security (Must Do Before Launch):

- [ ] Fix loyalty points manipulation vulnerability
- [ ] Fix customer PII exposure
- [ ] Fix bug report email exposure
- [ ] Fix payment data security
- [ ] Enable leaked password protection
- [ ] Reduce OTP expiry to 600s
- [ ] Upgrade Postgres version
- [ ] Fix function search paths

### SEO Essentials (Must Do Before Launch):

- [ ] Add meta descriptions to all pages
- [ ] Add Product schema to product pages
- [ ] Generate dynamic sitemap
- [ ] Configure robots.txt
- [ ] Add Open Graph tags
- [ ] Optimize images (WebP, lazy load)

### Legal Essentials (Must Do Before Launch):

- [ ] Cookie consent banner
- [ ] Privacy policy updated
- [ ] GDPR compliance verified
- [ ] Customs information added
- [ ] Return policy verified

### Testing Essentials (Must Do Before Launch):

- [ ] Complete checkout flow tested
- [ ] Real payment tested
- [ ] Mobile responsive verified
- [ ] Lighthouse score > 90
- [ ] Cross-browser tested

---

## 🎯 ESTIMATED TIMELINE

| Phase                       | Duration | Priority  |
| --------------------------- | -------- | --------- |
| Phase 1: Critical Security  | 1-2 days | 🔥 URGENT |
| Phase 2: Medium Security    | 1 day    | 🔥 HIGH   |
| Phase 3: SEO & Performance  | 1-2 days | ⚠️ HIGH   |
| Phase 4: Content Audit      | 2-3 days | ⚠️ MEDIUM |
| Phase 5: Testing & QA       | 2 days   | ⚠️ HIGH   |
| Phase 6: Legal & Compliance | 1 day    | ⚠️ HIGH   |
| Phase 7: Monitoring         | 1 day    | ⚠️ MEDIUM |
| Phase 8: Backup & Recovery  | 0.5 day  | ⚠️ MEDIUM |
| Phase 9: Deployment         | 0.5 day  | 🔥 HIGH   |

**Total Estimated Time**: 10-13 days

---

## 📞 SUPPORT RESOURCES

- **Supabase Dashboard**: https://supabase.com/dashboard/project/xcvlijchkmhjonhfildm
- **Lovable Docs**: https://docs.lovable.dev
- **Security Guide**: https://docs.lovable.dev/features/security
- **Troubleshooting**: https://docs.lovable.dev/tips-tricks/troubleshooting

---

## ✅ SIGN-OFF

Once all phases are complete, have stakeholders sign off:

- [ ] **Technical Lead**: All security fixes applied **\*\***\_\_\_**\*\***
- [ ] **Content Lead**: Content audit complete **\*\***\_\_\_**\*\***
- [ ] **Legal**: Compliance verified **\*\***\_\_\_**\*\***
- [ ] **Business Owner**: Ready to launch **\*\***\_\_\_**\*\***

**Launch Date**: **\*\***\_\_\_**\*\***
**Launch Time**: **\*\***\_\_\_**\*\***
**Launched By**: **\*\***\_\_\_**\*\***
