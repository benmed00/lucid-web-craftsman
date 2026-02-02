// src/hooks/useGuestSession.ts
// GDPR-compliant guest session tracking with minimal data collection

import { useState, useEffect, useCallback } from 'react';
import { safeGetItem, safeSetItem, StorageTTL } from '@/lib/storage/safeStorage';

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
  createdAt: number;
  device: GuestDeviceMetadata;
}

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
  if (/ipad|tablet|playbook|silk/.test(ua) || (ua.includes('android') && !ua.includes('mobile'))) {
    return 'tablet';
  }
  
  // Check for mobile devices
  if (/mobile|iphone|ipod|android.*mobile|windows phone|bb|blackberry/.test(ua)) {
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

  // Initialize or restore guest session on mount
  useEffect(() => {
    const initSession = () => {
      // Try to restore existing session
      const stored = safeGetItem<GuestSession>(GUEST_SESSION_KEY, {
        storage: 'localStorage',
      });

      if (stored && stored.guestId) {
        // Update device metadata on each visit (in case browser/device changed)
        const updatedSession: GuestSession = {
          ...stored,
          device: createDeviceMetadata(),
        };
        
        safeSetItem(GUEST_SESSION_KEY, updatedSession, {
          storage: 'localStorage',
          ttl: StorageTTL.MONTH, // 30 days TTL for GDPR compliance
        });
        
        setSession(updatedSession);
      } else {
        // Create new guest session
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
      }
      
      setIsInitialized(true);
    };

    initSession();
  }, []);

  /**
   * Get session data for API calls (checkout, analytics, etc.)
   */
  const getSessionData = useCallback(() => {
    if (!session) {
      // Return a temporary session if not yet initialized
      return {
        guest_id: generateUUID(),
        device_type: getDeviceType(),
        os: getOS(),
        browser: getBrowser(),
      };
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
