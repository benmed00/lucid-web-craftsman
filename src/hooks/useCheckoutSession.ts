/**
 * Checkout Session Hook
 * Persists checkout progress to database for tracking abandoned checkouts
 * and enabling admin visibility into incomplete orders
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase, createGuestClient } from '@/integrations/supabase/client';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

// Session status types
export type CheckoutSessionStatus = 'in_progress' | 'completed' | 'abandoned' | 'payment_failed';

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
  // Save personal info (step 1)
  savePersonalInfo: (data: PersonalInfo) => Promise<void>;
  // Save shipping info (step 2)
  saveShippingInfo: (data: ShippingInfo) => Promise<void>;
  // Save promo code (at any step)
  savePromoCode: (data: PromoCodeData | null) => Promise<void>;
  // Save cart snapshot
  saveCartSnapshot: (items: CartItemSnapshot[], subtotal: number, shipping: number, total: number) => Promise<void>;
  // Update step
  updateStep: (currentStep: number, lastCompletedStep: number) => Promise<void>;
  // Mark as completed (linked to order)
  markCompleted: (orderId: string) => Promise<void>;
  // Mark as payment failed
  markPaymentFailed: () => Promise<void>;
  // Get current session data
  getSessionData: () => CheckoutSessionData | null;
}

export function useCheckoutSession(): UseCheckoutSessionReturn {
  const { user } = useOptimizedAuth();
  const { getSessionData: getGuestData } = useGuestSession();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<CheckoutSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const initRef = useRef(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  // Initialize or retrieve existing session
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initSession = async () => {
      setIsLoading(true);
      try {
        const guestData = getGuestData();
        const guestId = guestData?.guest_id || null;
        const userId = user?.id || null;

        // Try to find existing active session
        let existingSession = null;
        
        if (userId) {
          const { data } = await supabase
            .from('checkout_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'in_progress')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          existingSession = data;
        } else if (guestId) {
          const guestClient = createGuestClient();
          const { data } = await guestClient
            .from('checkout_sessions')
            .select('*')
            .eq('guest_id', guestId)
            .eq('status', 'in_progress')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          existingSession = data;
        }

        if (existingSession) {
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
          // Create new session
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

          // Use createGuestClient to ensure x-guest-id header is current
          const guestClient = createGuestClient();
          const { data, error: insertError } = await guestClient
            .from('checkout_sessions')
            .insert(newSession)
            .select('id')
            .single();

          if (insertError) {
            console.error('[useCheckoutSession] Error creating session:', insertError);
            setError('Failed to create checkout session');
          } else if (data) {
            setSessionId(data.id);
            setSessionData({
              id: data.id,
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
            });
          }
        }
      } catch (err) {
        console.error('[useCheckoutSession] Init error:', err);
        setError('Failed to initialize checkout session');
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [user, getGuestData]);

  // Queue-based update to prevent race conditions
  const queueUpdate = useCallback((updateFn: () => Promise<void>) => {
    saveQueue.current = saveQueue.current.then(updateFn).catch(console.error);
    return saveQueue.current;
  }, []);

  // Update session in database
  const updateSession = useCallback(async (updates: Record<string, unknown>) => {
    if (!sessionId) return;

    try {
      const guestClient = createGuestClient();
      const { error: updateError } = await guestClient
        .from('checkout_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('[useCheckoutSession] Update error:', updateError);
      }
    } catch (err) {
      console.error('[useCheckoutSession] Update exception:', err);
    }
  }, [sessionId]);

  // Save personal info (step 1 complete)
  const savePersonalInfo = useCallback(async (data: PersonalInfo) => {
    await queueUpdate(async () => {
      await updateSession({
        personal_info: data,
        last_completed_step: Math.max(sessionData?.last_completed_step || 0, 1),
      });
      setSessionData(prev => prev ? {
        ...prev,
        personal_info: data,
        last_completed_step: Math.max(prev.last_completed_step, 1),
      } : null);
    });
  }, [queueUpdate, updateSession, sessionData?.last_completed_step]);

  // Save shipping info (step 2 complete)
  const saveShippingInfo = useCallback(async (data: ShippingInfo) => {
    await queueUpdate(async () => {
      await updateSession({
        shipping_info: data,
        last_completed_step: Math.max(sessionData?.last_completed_step || 0, 2),
      });
      setSessionData(prev => prev ? {
        ...prev,
        shipping_info: data,
        last_completed_step: Math.max(prev.last_completed_step, 2),
      } : null);
    });
  }, [queueUpdate, updateSession, sessionData?.last_completed_step]);

  // Save promo code data
  const savePromoCode = useCallback(async (data: PromoCodeData | null) => {
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
      setSessionData(prev => prev ? {
        ...prev,
        promo_code: data?.code || null,
        promo_code_valid: data?.valid || null,
        promo_discount_type: data?.discount_type || null,
        promo_discount_value: data?.discount_value || null,
        promo_discount_applied: data?.discount_applied || null,
        promo_free_shipping: data?.free_shipping || false,
      } : null);
    });
  }, [queueUpdate, updateSession]);

  // Save cart snapshot
  const saveCartSnapshot = useCallback(async (
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
      setSessionData(prev => prev ? {
        ...prev,
        cart_items: items,
        subtotal,
        shipping_cost: shipping,
        total,
      } : null);
    });
  }, [queueUpdate, updateSession]);

  // Update current step
  const updateStep = useCallback(async (currentStep: number, lastCompletedStep: number) => {
    await queueUpdate(async () => {
      await updateSession({
        current_step: currentStep,
        last_completed_step: lastCompletedStep,
      });
      setSessionData(prev => prev ? {
        ...prev,
        current_step: currentStep,
        last_completed_step: lastCompletedStep,
      } : null);
    });
  }, [queueUpdate, updateSession]);

  // Mark session as completed with order link
  const markCompleted = useCallback(async (orderId: string) => {
    await queueUpdate(async () => {
      await updateSession({
        status: 'completed',
        order_id: orderId,
        completed_at: new Date().toISOString(),
        last_completed_step: 3, // Payment step
      });
      setSessionData(prev => prev ? {
        ...prev,
        status: 'completed',
        order_id: orderId,
        last_completed_step: 3,
      } : null);
    });
  }, [queueUpdate, updateSession]);

  // Mark session as payment failed
  const markPaymentFailed = useCallback(async () => {
    await queueUpdate(async () => {
      await updateSession({
        status: 'payment_failed',
        current_step: 3,
        last_completed_step: 2,
      });
      setSessionData(prev => prev ? {
        ...prev,
        status: 'payment_failed',
        current_step: 3,
        last_completed_step: 2,
      } : null);
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
