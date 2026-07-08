// src/hooks/useGuestSession.ts
// GDPR-compliant guest session tracking with server-signed tokens

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  safeGetItem,
  safeSetItem,
  StorageTTL,
} from '@/lib/storage/safeStorage';
import { supabase } from '@/integrations/supabase/client';
import { createGuestScopedQueryPredicate } from '@/lib/checkout/queryKeys';


// Storage key for guest session
const GUEST_SESSION_KEY = 'guest_session';

// Device metadata interface - minimal and GDPR-compliant
export interface GuestDeviceMetadata {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
}

// Guest session interface
export interface GuestSession {
  guestId: string;
  signature?: string;
  expiresAt?: number; // epoch ms — server-issued token expiry (24h)
  createdAt: number;
  device: GuestDeviceMetadata;
}

// Renew token this many ms before actual expiry (clock skew buffer)
const EXPIRY_SKEW_MS = 5 * 60 * 1000; // 5 minutes


/**
 * Generate a cryptographically secure UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Parse user agent to extract device type (no fingerprinting)
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';

  const ua = navigator.userAgent.toLowerCase();

  // Check for tablets first (they often match mobile patterns too)
  if (
    /ipad|tablet|playbook|silk/.test(ua) ||
    (ua.includes('android') && !ua.includes('mobile'))
  ) {
    return 'tablet';
  }

  // Check for mobile devices
  if (
    /mobile|iphone|ipod|android.*mobile|windows phone|bb|blackberry/.test(ua)
  ) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Parse OS from user agent (generalized, not fingerprinting)
 */
function getOS(): string {
  if (typeof navigator === 'undefined') return 'Unknown';

  const ua = navigator.userAgent;

  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Linux/.test(ua) && !/Android/.test(ua)) return 'Linux';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/CrOS/.test(ua)) return 'ChromeOS';

  return 'Unknown';
}

/**
 * Parse browser from user agent (generalized)
 */
function getBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown';

  const ua = navigator.userAgent;

  // Order matters - check specific browsers before generic ones
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if (/MSIE|Trident/.test(ua)) return 'IE';

  return 'Unknown';
}

/**
 * Create device metadata object
 */
function createDeviceMetadata(): GuestDeviceMetadata {
  return {
    deviceType: getDeviceType(),
    os: getOS(),
    browser: getBrowser(),
  };
}

/**
 * Hook for managing guest sessions
 * GDPR-compliant: generates a session UUID, stores device type/OS/browser
 * Does NOT collect: MAC address, IP (handled server-side), canvas fingerprint, etc.
 */
export function useGuestSession() {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  // Initialize or restore guest session on mount
  useEffect(() => {
    type TokenPayload = {
      guestId: string;
      signature?: string;
      expiresAt?: number;
    };

    const parseTokenData = (
      td: Record<string, string> | null
    ): TokenPayload => {
      const expiresAtMs = td?.expires_at
        ? new Date(td.expires_at).getTime()
        : undefined;
      return {
        guestId: td?.guest_id ?? generateUUID(),
        signature: td?.signature,
        expiresAt: Number.isFinite(expiresAtMs) ? expiresAtMs : undefined,
      };
    };

    const mintNewToken = async (): Promise<TokenPayload> => {
      try {
        const { data, error } = await supabase.rpc('create_guest_token');
        if (error) {
          if (import.meta.env.DEV) {
            console.warn('[useGuestSession] create_guest_token:', error.message);
          }
          return { guestId: generateUUID() };
        }
        return parseTokenData(data as Record<string, string> | null);
      } catch {
        return { guestId: generateUUID() };
      }
    };

    const rotateToken = async (
      oldGuestId: string,
      oldSignature: string
    ): Promise<TokenPayload> => {
      try {
        const { data, error } = await supabase.rpc('rotate_guest_token', {
          _old_guest_id: oldGuestId,
          _old_signature: oldSignature,
        });
        if (error) {
          if (import.meta.env.DEV) {
            console.warn('[useGuestSession] rotate_guest_token:', error.message);
          }
          return mintNewToken();
        }
        return parseTokenData(data as Record<string, string> | null);
      } catch {
        return mintNewToken();
      }
    };

    const persist = (s: GuestSession) => {
      safeSetItem(GUEST_SESSION_KEY, s, {
        storage: 'localStorage',
        ttl: StorageTTL.MONTH,
      });
      setSession(s);
    };

    const initSession = async () => {
      const stored = safeGetItem<GuestSession>(GUEST_SESSION_KEY, {
        storage: 'localStorage',
      });

      const now = Date.now();
      const isExpired =
        stored?.signature &&
        typeof stored.expiresAt === 'number' &&
        stored.expiresAt - EXPIRY_SKEW_MS <= now;

      if (stored && stored.guestId && !isExpired) {
        persist({ ...stored, device: createDeviceMetadata() });
      } else {
        // Prefer rotation (migrates existing checkout_sessions atomically);
        // fall back to a fresh token when no prior signed session exists.
        const canRotate = Boolean(stored?.guestId && stored?.signature);
        const token = canRotate
          ? await rotateToken(stored!.guestId, stored!.signature!)
          : await mintNewToken();

        const rotated = canRotate && token.guestId !== stored!.guestId;

        persist({
          guestId: token.guestId,
          signature: token.signature,
          expiresAt: token.expiresAt,
          createdAt: now,
          device: createDeviceMetadata(),
        });

        // After a successful rotation, the DB has migrated ongoing
        // checkout_sessions from the old guest_id to the new one.
        // Targeted invalidation: only touch query keys that reference the
        // old or new guest_id — avoid blowing away unrelated checkout cache.
        if (rotated) {
          const oldGuestId = stored!.guestId;
          const newGuestId = token.guestId;

          queryClient.invalidateQueries({
            predicate: createGuestScopedQueryPredicate([
              oldGuestId,
              newGuestId,
            ]),
          });

          // Notify non-query listeners (analytics, custom subscriptions)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('guest-session:rotated', {
                detail: { oldGuestId, newGuestId },
              })
            );
          }
        }
      }

      setIsInitialized(true);
    };

    initSession();
  }, [queryClient]);



  /**
   * Get session data for API calls (checkout, analytics, etc.)
   * IMPORTANT: Never generate a random UUID here — return null if not ready
   * to prevent orphaned checkout sessions with mismatched guest IDs.
   */
  const getSessionData = useCallback(() => {
    if (!session) {
      return null;
    }

    return {
      guest_id: session.guestId,
      device_type: session.device.deviceType,
      os: session.device.os,
      browser: session.device.browser,
    };
  }, [session]);

  /**
   * Clear guest session (for privacy/GDPR requests)
   */
  const clearSession = useCallback(() => {
    safeSetItem(GUEST_SESSION_KEY, null, { storage: 'localStorage' });

    // Create a fresh session
    const newSession: GuestSession = {
      guestId: generateUUID(),
      createdAt: Date.now(),
      device: createDeviceMetadata(),
    };

    safeSetItem(GUEST_SESSION_KEY, newSession, {
      storage: 'localStorage',
      ttl: StorageTTL.MONTH,
    });

    setSession(newSession);
  }, []);

  return {
    guestId: session?.guestId || null,
    deviceMetadata: session?.device || null,
    isInitialized,
    getSessionData,
    clearSession,
  };
}

export default useGuestSession;
