/**
 * Checkout session hook: tracks in-progress checkout for analytics and recovery.
 *
 * **Standard customers / guests:** reads existing `checkout_sessions` on load; **creates a DB row
 * only on the first persist** (step submit / snapshot) to avoid ghost sessions from bounces.
 *
 * **Elevated storefront (admin browsing the shop):** after `resolveCartSyncPolicy`,
 * `isElevatedStorefrontUser()` is true — we keep session state **in memory only** (no DB
 * rows) so admin checkout drafts never collide with real customer sessions.
 *
 * NON-BLOCKING: session tracking failures never block checkout.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { retryWithBackoffSilent } from '@/lib/retryWithBackoff';
import {
  resolveCartSyncPolicy,
  isElevatedStorefrontUser,
} from '@/lib/cart/cartSyncPolicy';
import { checkoutQueryKeys } from '@/lib/checkout/queryKeys';
import {
  fetchActiveCheckoutSessionByGuestId,
  fetchActiveCheckoutSessionByUserId,
  insertCheckoutSession,
  updateCheckoutSessionRow,
  signOutLocalScope,
} from '@/services/checkoutApi';

/** In-memory-only session for admin users on the storefront (no checkout_sessions rows). */
function buildInitialSessionData(
  guestId: string | null,
  userId: string | null
): CheckoutSessionData {
  return {
    id: null,
    guest_id: guestId,
    user_id: userId,
    current_step: 1,
    last_completed_step: 0,
    status: 'in_progress',
    personal_info: null,
    shipping_info: null,
    promo_code: null,
    promo_code_valid: null,
    promo_discount_type: null,
    promo_discount_value: null,
    promo_discount_applied: null,
    promo_free_shipping: false,
    cart_items: null,
    subtotal: 0,
    shipping_cost: 0,
    total: 0,
    order_id: null,
  };
}

// Session status types
export type CheckoutSessionStatus =
  | 'in_progress'
  | 'completed'
  | 'abandoned'
  | 'payment_failed';

// Personal info as stored in DB
export interface PersonalInfo {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

// Shipping info as stored in DB
export interface ShippingInfo {
  address_line1: string;
  address_line2?: string;
  postal_code: string;
  city: string;
  country: string;
}

// Promo code data for persistence
export interface PromoCodeData {
  code: string;
  valid: boolean;
  discount_type: 'percentage' | 'fixed' | null;
  discount_value: number;
  discount_applied: number;
  free_shipping: boolean;
}

// Cart item for snapshot
export interface CartItemSnapshot {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// Full checkout session data
export interface CheckoutSessionData {
  id: string | null;
  guest_id: string | null;
  user_id: string | null;
  current_step: number;
  last_completed_step: number;
  status: CheckoutSessionStatus;
  personal_info: PersonalInfo | null;
  shipping_info: ShippingInfo | null;
  promo_code: string | null;
  promo_code_valid: boolean | null;
  promo_discount_type: string | null;
  promo_discount_value: number | null;
  promo_discount_applied: number | null;
  promo_free_shipping: boolean;
  cart_items: CartItemSnapshot[] | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  order_id: string | null;
}

interface UseCheckoutSessionReturn {
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  savePersonalInfo: (data: PersonalInfo) => Promise<void>;
  saveShippingInfo: (data: ShippingInfo) => Promise<void>;
  savePromoCode: (data: PromoCodeData | null) => Promise<void>;
  saveCartSnapshot: (
    items: CartItemSnapshot[],
    subtotal: number,
    shipping: number,
    total: number
  ) => Promise<void>;
  updateStep: (currentStep: number, lastCompletedStep: number) => Promise<void>;
  markCompleted: (orderId: string) => Promise<void>;
  markPaymentFailed: () => Promise<void>;
  getSessionData: () => CheckoutSessionData | null;
}

export function useCheckoutSession(): UseCheckoutSessionReturn {
  const queryClient = useQueryClient();
  const { user } = useOptimizedAuth();
  const { getSessionData: getGuestData, isInitialized: isGuestReady } =
    useGuestSession();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<CheckoutSessionData | null>(
    null
  );
  // NON-BLOCKING: start as false so checkout form renders immediately
  const [isLoading, _setIsLoading] = useState(false);
  const [error, _setError] = useState<string | null>(null);

  const initRef = useRef(false);
  const initInFlight = useRef(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const sessionIdRef = useRef<string | null>(null);
  const ensureSessionPromiseRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Initialize or retrieve existing session — runs in background, never blocks checkout
  useEffect(() => {
    if (!isGuestReady) return;
    if (initRef.current || initInFlight.current) return;
    initInFlight.current = true;
    initRef.current = true;

    const initSession = async () => {
      try {
        const guestData = getGuestData();
        // If guest session isn't ready yet, guestData may be null — wait for next render
        if (!guestData && !user) {
          console.warn(
            '[useCheckoutSession] No guest data or user — skipping session init'
          );
          return;
        }
        const guestId = guestData?.guest_id || null;
        const userId = user?.id || null;

        await resolveCartSyncPolicy(userId);
        if (isElevatedStorefrontUser()) {
          sessionIdRef.current = null;
          setSessionData(buildInitialSessionData(guestId, userId));
          setSessionId(null);
          return;
        }

        // Try to find existing active session
        let existingSession = null;

        if (userId) {
          existingSession = await fetchActiveCheckoutSessionByUserId(userId);
        } else if (guestId) {
          existingSession = await fetchActiveCheckoutSessionByGuestId(guestId);
        }

        if (existingSession) {
          sessionIdRef.current = existingSession.id;
          setSessionId(existingSession.id);
          setSessionData({
            id: existingSession.id,
            guest_id: existingSession.guest_id,
            user_id: existingSession.user_id,
            current_step: existingSession.current_step,
            last_completed_step: existingSession.last_completed_step,
            status: existingSession.status as CheckoutSessionStatus,
            personal_info: existingSession.personal_info as PersonalInfo | null,
            shipping_info: existingSession.shipping_info as ShippingInfo | null,
            promo_code: existingSession.promo_code,
            promo_code_valid: existingSession.promo_code_valid,
            promo_discount_type: existingSession.promo_discount_type,
            promo_discount_value: existingSession.promo_discount_value,
            promo_discount_applied: existingSession.promo_discount_applied,
            promo_free_shipping: existingSession.promo_free_shipping || false,
            cart_items: existingSession.cart_items as CartItemSnapshot[] | null,
            subtotal: existingSession.subtotal || 0,
            shipping_cost: existingSession.shipping_cost || 0,
            total: existingSession.total || 0,
            order_id: existingSession.order_id,
          });
        } else {
          // Defer DB insert until first save — in-memory session only (reduces ghost rows).
          sessionIdRef.current = null;
          setSessionData(buildInitialSessionData(guestId, userId));
          setSessionId(null);
        }
      } catch (err) {
        // Non-blocking: checkout works even if session tracking fails
        console.warn('[useCheckoutSession] Init failed (non-blocking):', err);
      } finally {
        initInFlight.current = false;
      }
    };

    initSession();
  }, [user, getGuestData, isGuestReady]);

  // Queue-based update to prevent race conditions
  const queueUpdate = useCallback((updateFn: () => Promise<void>) => {
    saveQueue.current = saveQueue.current.then(updateFn).catch(() => {
      // Non-blocking: silently handle update failures
    });
    return saveQueue.current;
  }, []);

  /** Creates `checkout_sessions` row on first write (lazy init). */
  const ensureCheckoutSessionId = useCallback(async (): Promise<
    string | null
  > => {
    if (isElevatedStorefrontUser()) return null;
    const existing = sessionIdRef.current;
    if (existing) return existing;
    if (ensureSessionPromiseRef.current) {
      return ensureSessionPromiseRef.current;
    }

    const pending = (async (): Promise<string | null> => {
      try {
        const guestData = getGuestData();
        const guestId = guestData?.guest_id ?? null;
        const userId = user?.id ?? null;
        if (!guestId && !userId) return null;

        const newSession = {
          guest_id: guestId,
          user_id: userId,
          current_step: 1,
          last_completed_step: 0,
          status: 'in_progress',
          device_type: guestData?.device_type || null,
          browser: guestData?.browser || null,
          os: guestData?.os || null,
        };

        const result = await retryWithBackoffSilent(
          async () => {
            try {
              return await insertCheckoutSession(newSession);
            } catch (insertError: unknown) {
              const msg =
                insertError instanceof Error
                  ? insertError.message
                  : String(insertError);
              if (
                msg.includes('401') ||
                msg.includes('JWT') ||
                msg.includes('row-level security')
              ) {
                console.warn(
                  '[useCheckoutSession] Stale JWT detected, cleaning auth state'
                );
                const { cleanupAuthState } = await import(
                  '@/context/AuthContext'
                );
                cleanupAuthState();
                await signOutLocalScope();
              }
              throw insertError;
            }
          },
          null,
          {
            maxAttempts: 3,
            baseDelayMs: 1000,
            onRetry: (attempt, err) => {
              console.warn(
                `[useCheckoutSession] Session creation retry #${attempt}:`,
                err
              );
            },
          }
        );

        if (result?.id) {
          sessionIdRef.current = result.id;
          setSessionId(result.id);
          setSessionData((prev) => {
            const base = prev ?? buildInitialSessionData(guestId, userId);
            return { ...base, id: result.id };
          });
          void queryClient.invalidateQueries({
            queryKey: checkoutQueryKeys.activeSession(userId, guestId),
          });
          return result.id;
        }
        return null;
      } finally {
        ensureSessionPromiseRef.current = null;
      }
    })();

    ensureSessionPromiseRef.current = pending;
    return pending;
  }, [getGuestData, user?.id, queryClient]);

  // Update session in database
  const updateSession = useCallback(
    async (updates: Record<string, unknown>) => {
      if (isElevatedStorefrontUser()) {
        setSessionData((prev) => {
          const guestData = getGuestData();
          const gid = guestData?.guest_id ?? null;
          const base = prev ?? buildInitialSessionData(gid, user?.id ?? null);
          return { ...base, ...updates } as CheckoutSessionData;
        });
        return;
      }

      const sid = await ensureCheckoutSessionId();
      if (!sid) return;

      try {
        await updateCheckoutSessionRow(sid, updates);
        void queryClient.invalidateQueries({
          queryKey: checkoutQueryKeys.activeSession(
            user?.id ?? null,
            getGuestData()?.guest_id ?? null
          ),
        });
        void queryClient.invalidateQueries({
          queryKey: checkoutQueryKeys.sessionById(sid),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[useCheckoutSession] Update failed (non-blocking):', msg);
      }
    },
    [ensureCheckoutSessionId, getGuestData, user?.id, queryClient]
  );

  // Save personal info (step 1 complete)
  const savePersonalInfo = useCallback(
    async (data: PersonalInfo) => {
      await queueUpdate(async () => {
        // Read latest step from ref-like state to avoid stale closure
        const currentStep = sessionData?.last_completed_step || 0;
        const newStep = Math.max(currentStep, 1);
        await updateSession({
          personal_info: data,
          last_completed_step: newStep,
        });
        setSessionData((prev) =>
          prev
            ? {
                ...prev,
                personal_info: data,
                last_completed_step: Math.max(prev.last_completed_step, 1),
              }
            : null
        );
      });
    },
    [queueUpdate, updateSession]
  );

  // Save shipping info (step 2 complete)
  const saveShippingInfo = useCallback(
    async (data: ShippingInfo) => {
      await queueUpdate(async () => {
        const currentStep = sessionData?.last_completed_step || 0;
        const newStep = Math.max(currentStep, 2);
        await updateSession({
          shipping_info: data,
          last_completed_step: newStep,
        });
        setSessionData((prev) =>
          prev
            ? {
                ...prev,
                shipping_info: data,
                last_completed_step: Math.max(prev.last_completed_step, 2),
              }
            : null
        );
      });
    },
    [queueUpdate, updateSession]
  );

  // Save promo code data
  const savePromoCode = useCallback(
    async (data: PromoCodeData | null) => {
      await queueUpdate(async () => {
        if (data) {
          await updateSession({
            promo_code: data.code,
            promo_code_valid: data.valid,
            promo_discount_type: data.discount_type,
            promo_discount_value: data.discount_value,
            promo_discount_applied: data.discount_applied,
            promo_free_shipping: data.free_shipping,
          });
        } else {
          await updateSession({
            promo_code: null,
            promo_code_valid: null,
            promo_discount_type: null,
            promo_discount_value: null,
            promo_discount_applied: null,
            promo_free_shipping: false,
          });
        }
        setSessionData((prev) =>
          prev
            ? {
                ...prev,
                promo_code: data?.code || null,
                promo_code_valid: data?.valid || null,
                promo_discount_type: data?.discount_type || null,
                promo_discount_value: data?.discount_value || null,
                promo_discount_applied: data?.discount_applied || null,
                promo_free_shipping: data?.free_shipping || false,
              }
            : null
        );
      });
    },
    [queueUpdate, updateSession]
  );

  // Save cart snapshot
  const saveCartSnapshot = useCallback(
    async (
      items: CartItemSnapshot[],
      subtotal: number,
      shipping: number,
      total: number
    ) => {
      await queueUpdate(async () => {
        await updateSession({
          cart_items: items,
          subtotal,
          shipping_cost: shipping,
          total,
        });
        setSessionData((prev) =>
          prev
            ? {
                ...prev,
                cart_items: items,
                subtotal,
                shipping_cost: shipping,
                total,
              }
            : null
        );
      });
    },
    [queueUpdate, updateSession]
  );

  // Update current step
  const updateStep = useCallback(
    async (currentStep: number, lastCompletedStep: number) => {
      await queueUpdate(async () => {
        await updateSession({
          current_step: currentStep,
          last_completed_step: lastCompletedStep,
        });
        setSessionData((prev) =>
          prev
            ? {
                ...prev,
                current_step: currentStep,
                last_completed_step: lastCompletedStep,
              }
            : null
        );
      });
    },
    [queueUpdate, updateSession]
  );

  // Mark session as completed with order link
  const markCompleted = useCallback(
    async (orderId: string) => {
      await queueUpdate(async () => {
        await updateSession({
          status: 'completed',
          order_id: orderId,
          completed_at: new Date().toISOString(),
          last_completed_step: 3,
        });
        setSessionData((prev) =>
          prev
            ? {
                ...prev,
                status: 'completed',
                order_id: orderId,
                last_completed_step: 3,
              }
            : null
        );
      });
    },
    [queueUpdate, updateSession]
  );

  // Mark session as payment failed
  const markPaymentFailed = useCallback(async () => {
    await queueUpdate(async () => {
      await updateSession({
        status: 'payment_failed',
        current_step: 3,
        last_completed_step: 2,
      });
      setSessionData((prev) =>
        prev
          ? {
              ...prev,
              status: 'payment_failed',
              current_step: 3,
              last_completed_step: 2,
            }
          : null
      );
    });
  }, [queueUpdate, updateSession]);

  // Get current session data
  const getSessionData = useCallback(() => sessionData, [sessionData]);

  return {
    sessionId,
    isLoading,
    error,
    savePersonalInfo,
    saveShippingInfo,
    savePromoCode,
    saveCartSnapshot,
    updateStep,
    markCompleted,
    markPaymentFailed,
    getSessionData,
  };
}

export default useCheckoutSession;
