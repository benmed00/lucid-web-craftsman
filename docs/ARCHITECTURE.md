# Architecture Documentation

## Overview

This document describes the architectural patterns and conventions used in the Rif Raw Straw e-commerce application.

## Directory Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI primitives (shadcn)
│   ├── admin/          # Admin-specific components
│   ├── checkout/       # Checkout flow components
│   ├── layout/         # Layout wrappers
│   ├── performance/    # Performance optimization components
│   ├── profile/        # User profile components
│   ├── reviews/        # Product review components
│   └── seo/            # SEO-related components
├── config/             # Application configuration
│   ├── app.config.ts   # Central app settings (CSP, API endpoints, etc.)
│   └── index.ts        # Config exports
├── context/            # React Context providers (minimal - prefer Zustand)
├── hooks/              # Custom React hooks
├── lib/                # Core utilities
│   ├── api/            # API client and network utilities
│   ├── cache/          # Caching system
│   ├── errors/         # Error types and handlers
│   ├── hooks/          # Low-level utility hooks
│   └── storage/        # Safe localStorage wrapper
├── pages/              # Route components
│   └── admin/          # Admin pages
├── services/           # External service integrations
├── shared/             # Shared types and interfaces
├── stores/             # Zustand state stores
├── styles/             # Additional CSS
├── tests/              # Test files
├── types/              # TypeScript types
└── utils/              # Utility functions
```

## Key Architectural Patterns

### 1. State Management (Zustand)

All global state is managed via Zustand stores in `src/stores/`:

- **cartStore**: Shopping cart with offline sync
- **currencyStore**: Currency conversion and formatting
- **themeStore**: Light/dark theme management
- **wishlistStore**: User wishlist

**Pattern**: Each store exports:
- The raw Zustand hook (`useCartStore`)
- Stable selectors (`selectCartItems`)
- A compatibility hook (`useCart`)
- An initialization function (`initializeCartStore`)

### 2. Error Handling

Centralized in `src/lib/errors/AppError.ts`:

```typescript
import { AppError, NetworkError, trySafe } from '@/lib';

// Wrap async operations
const [data, error] = await trySafe(() => fetchData());
if (error) {
  // Handle typed error
}
```

### 3. API Calls

Use the centralized API client from `src/lib/api/apiClient.ts`:

```typescript
import { currencyApi } from '@/lib';

const rates = await currencyApi.get<RatesResponse>('/latest?from=EUR');
```

### 4. Hook Stability

Use stable callbacks to prevent re-render loops:

```typescript
import { useStableCallback } from '@/lib';

const handleClick = useStableCallback((id: string) => {
  // This function reference never changes
});
```

### 5. Configuration

All external services and CSP are defined in `src/config/app.config.ts`. Never hardcode URLs or security policies in components.

## Design System

### Tokens

All colors use HSL CSS variables defined in `src/index.css`:

```css
/* DO THIS */
className="text-foreground bg-primary"

/* NOT THIS */
className="text-black bg-[#4f5f31]"
```

### Components

UI primitives are in `src/components/ui/` (shadcn-based). Always use these instead of raw HTML elements for consistency.

## Security

### Content Security Policy

CSP is defined in:
1. `src/config/app.config.ts` - Source of truth
2. `public/_headers` - Production headers
3. `index.html` - Meta tag fallback

When adding new external services, update all three locations.

### RLS Policies

All Supabase tables use Row Level Security. Test policies before deployment.

## Performance

### Lazy Loading

Non-critical pages use `lazyWithRetry()` wrapper with automatic reload on chunk failures.

### Code Splitting

Admin routes and secondary pages are code-split automatically via React.lazy().

### Caching

- Static assets: 1 year (immutable)
- HTML: No cache
- API responses: Managed by React Query (5min stale, 10min gc)
