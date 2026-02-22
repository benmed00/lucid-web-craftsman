# Test Log Analysis — Explanations & Professional Improvements

This document analyzes the console output produced when running `npm run test` and provides explanations plus actionable recommendations.

---

## Applied Fixes (2026-02-22)

The following improvements have been implemented:

- **Supabase mock extended**: Added `.order()` to the `from().select().eq()` chain and `channel()` for wishlist/realtime support.
- **`initializeWishlistStore` mocked**: Prevents wishlist store from calling Supabase during AuthProvider init.
- **`waitFor` instead of custom `waitForCondition`**: Uses `@testing-library/react`'s `waitFor` for proper async handling and reduced `act()` warnings.
- **Console.error suppressed** in "useAuth outside provider" test to avoid expected-error noise.
- **React Router future flags** added to `MemoryRouter` in Navigation.test.tsx and BlogCard.test.tsx: `v7_startTransition`, `v7_relativeSplatPath`.

---

## 1. React `act(...)` Warnings

### What You See — act()

```text
Warning: An update to AuthProvider inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */
    at AuthProvider (src/context/AuthContext.tsx:82:25)
```

### Explanation — act()

- **Cause**: `AuthProvider` runs `initAuth()` in a `useEffect` on mount. That effect is async: it calls `getSession()`, `getUser()`, then optionally `initializeWishlistStore()`, `loadUserProfile()`, etc.
- **What happens**: These calls resolve later and call `setAuthState()`. React warns because the state update happens outside an `act()` call.
- **Impact**: The tests still pass because you use `waitForCondition()` and `await` before asserting. The warning is mainly about test hygiene and future-proofing.

### Recommendation — act()

Wrap the initial render and any async initialization in `act()` so React can flush updates correctly. For example:

```ts
// Option A: Use act around render
await act(async () => {
  const { result } = renderHook(() => useAuth(), { wrapper });
});
// Then assert after act completes

// Option B: Use waitFor from @testing-library/react (recommended)
const { result } = renderHook(() => useAuth(), { wrapper });
await waitFor(() => expect(result.current.isInitialized).toBe(true));
```

---

## 2. Supabase Mock Incomplete — Wishlist / Realtime Errors

### What You See — Supabase mock

```text
Error fetching wishlist: TypeError: __vite_ssr_import_2__.supabase.from(...).select(...).eq(...).order is not a function
    at Object.fetchWishlist (src/stores/wishlistStore.ts:82:14)
    at Object.setUserId (src/stores/wishlistStore.ts:63:17)
    at initializeWishlistStore (src/context/AuthContext.tsx:326:13)

Auth initialization error: TypeError: __vite_ssr_import_2__.supabase.channel is not a function
    at Object._setupRealtimeSubscription (src/stores/wishlistStore.ts:213:12)
```

### Explanation — Supabase mock

- **Cause**: `AuthContext` tests mock `@/integrations/supabase/client` only for `auth` and a minimal `from().select().eq().single()` chain.
- **Real behavior**: When `getSession()` returns a session, `initAuth` calls `initializeWishlistStore(userId)`, which uses `wishlistStore` that:
  1. Calls `supabase.from('wishlist').select('*').eq('user_id', userId).order('created_at', ...)` — the mock does not provide `.order()`.
  2. Calls `supabase.channel(...)` for realtime — the mock does not provide `.channel()`.
- **Impact**: These errors appear when tests simulate an authenticated session. They are caught and don’t fail the tests, but they pollute the logs and indicate the Supabase mock is incomplete.

### Recommendation — Supabase mock

Extend the Supabase mock in `AuthContext.test.tsx` to cover wishlist and realtime:

```ts
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { /* existing auth mocks */ },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({ /* ... */ }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  },
}));
```

Alternatively, mock `initializeWishlistStore` in the test so it never touches Supabase:

```ts
vi.mock('@/stores', () => ({
  initializeWishlistStore: vi.fn(),
}));
```

---

## 3. `useAuth` Outside Provider — Uncaught Error

### What You See — useAuth outside provider

```text
Error: Uncaught [Error: useAuth must be used within an AuthProvider]
    at Module.useAuth (src/context/AuthContext.tsx:568:11)
    at AuthContext.test.tsx:145:24
    at TestComponent
...
stderr | AuthContext.test.tsx > AuthProvider > should throw error when useAuth is used outside provider
The above error occurred in the <TestComponent> component...
Consider adding an error boundary to your tree...
```

### Explanation — useAuth outside provider

- **Cause**: The test explicitly calls `useAuth()` without `AuthProvider`, so the hook throws.
- **Expected behavior**: The test uses `expect(() => renderHook(...)).toThrow(...)`, which is correct. React still reports the error as “uncaught” before Vitest’s `toThrow` catches it.
- **Impact**: No functional impact. The test passes; the stack trace is normal for “expect error” tests.

### Recommendation — useAuth outside provider

To keep the console quieter:

```ts
it('should throw error when useAuth is used outside provider', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => {
    renderHook(() => useAuth());
  }).toThrow('useAuth must be used within an AuthProvider');
  consoleSpy.mockRestore();
});
```

Or use `expect().rejects` / `expect().toThrow` with error boundaries if you prefer to assert without console noise.

---

## 4. React Router Future Flag Warnings

### What You See — React Router flags

```text
⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early.
⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early.
```

### Explanation — React Router flags

- **Cause**: React Router v6 is preparing for v7. It emits warnings about upcoming behavior changes.
- **Impact**: Cosmetic only. Tests and app continue to work; the messages are informational.

### Recommendation — React Router flags

Opt into v7 behavior now to silence these warnings and align with future versions. If you use `createBrowserRouter` / `RouterProvider`:

```tsx
<RouterProvider router={router} future={{
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}} />
```

If you use `BrowserRouter`:

```tsx
<BrowserRouter future={{
  v7_startTransition: true,
  v7_relativeSplatPath: true,
}}>
```

Add the same `future` prop to `MemoryRouter` in tests for consistency.

---

## 5. Summary — Priority Matrix

<!-- markdownlint-disable MD060 -->
| Issue                       | Severity | Tests fail? | Recommended action                       |
|-----------------------------|----------|-------------|------------------------------------------|
| `act(...)` warnings        | Low      | No          | Use `waitFor` / `act` around async init  |
| Supabase mock incomplete   | Medium   | No          | Extend mock or mock `initializeWishlistStore` |
| useAuth outside provider   | Low      | No          | Suppress console.error if desired        |
| React Router future flags  | Low      | No          | Add `future` flags to Router             |
<!-- markdownlint-enable MD060 -->

---

## 6. Professional Test Setup Improvements

### 6.1 Centralized Supabase Mock

Create `src/tests/mocks/supabase.ts`:

```ts
import { vi } from 'vitest';

export const createSupabaseMock = (overrides = {}) => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithOtp: vi.fn(),
    verifyOtp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
    insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn() }) }),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn() }) }) }),
  }),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  }),
  ...overrides,
});
```

Then use this in `AuthContext.test.tsx` and other tests that need Supabase.

### 6.2 Suppress Expected Console Noise in Tests

In `setupTests.ts`, you can optionally filter known, expected errors:

```ts
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const msg = args[0];
  if (typeof msg === 'string' && msg.includes('useAuth must be used within an AuthProvider')) return;
  originalError.apply(console, args);
};
```

Use sparingly and only for tests that intentionally trigger errors.

### 6.3 Vitest Reporter / Output

To reduce noise during local runs:

```ts
// vite.config.ts test section
test: {
  // ...
  silent: false,  // Set true to hide most console output (use for CI)
  onConsoleLog(log, type) {
    if (type === 'error' && log.includes('useAuth must be used')) return false; // Suppress
    return true;
  },
},
```

---

## References

- [React Testing Library — act()](https://react.dev/reference/react/act)
- [Testing Library — waitFor](https://testing-library.com/docs/dom-testing-library/api-async#waitfor)
- [React Router v7 upgrade](https://reactrouter.com/v6/upgrading/future)
- [Vitest — Configuration](https://vitest.dev/config/)
