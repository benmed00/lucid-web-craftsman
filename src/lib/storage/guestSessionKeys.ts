// src/lib/storage/guestSessionKeys.ts
// Constants for guest session storage

export const GUEST_SESSION_KEY = 'guest_session';

// Guest session data that can be attached to orders/payments
export interface GuestSessionData {
  guest_id: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
}
