// src/context/AuthContext.tsx
// Unified Authentication Context with RBAC

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { User, Session, AuthOtpResponse } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { initializeWishlistStore } from '@/stores';
import { useQueryClient } from '@tanstack/react-query';
import { profileCache, useProfileActions } from './useProfileManager';
import type { AppRole } from '@/lib/rbac';
import { logRoleResolved, logSessionEvent } from '@/lib/rbac';

// Re-export AppRole for backward compat
export type { AppRole } from '@/lib/rbac';

// ============= Auth State Cleanup Utility =============
export const cleanupAuthState = () => {
  const storages = [localStorage, sessionStorage];
  storages.forEach((storage) => {
    try {
      Object.keys(storage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          storage.removeItem(key);
        }
      });
    } catch (e) {
      // Ignore storage errors
    }
  });
};

// ============= Types =============
import type { Json } from '@/integrations/supabase/types';

export interface Profile {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  location: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  facebook_url: string | null;
  twitter_handle: string | null;
  preferences: Json | null;
  notification_settings: Json | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole;
  isLoading: boolean;
  isInitialized: boolean;
  isRoleLoading: boolean;
}

interface AuthContextType extends AuthState {
  isAuthenticated: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ user: User | null; session: Session | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone?: string
  ) => Promise<{ user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
  signInWithOtp: (
    email: string,
    options?: { shouldCreateUser?: boolean }
  ) => Promise<AuthOtpResponse>;
  verifyOtp: (
    email: string,
    token: string,
    type?: 'email' | 'sms'
  ) => Promise<{ user: User | null; session: Session | null }>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (profileData: Partial<Profile>) => Promise<Profile>;
  refreshProfile: () => Promise<Profile | null>;
  refreshRole: () => Promise<AppRole>;
}

// ============= Context =============
const AuthContext = createContext<AuthContextType | null>(null);

// ============= Role Resolution =============
const ROLE_REFRESH_INTERVAL = 60_000; // 60 seconds

async function fetchUserRole(): Promise<AppRole> {
  try {
    const { data, error } = await supabase.rpc('get_user_role');
    if (error) {
      console.warn('[AUTH_ROLE_RESOLVED] RPC error, fallback to user:', error.message);
      return 'user';
    }
    return (data as string) as AppRole;
  } catch (err) {
    console.warn('[AUTH_ROLE_RESOLVED] Exception, fallback to user:', err);
    return 'user';
  }
}

// ============= Provider =============
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const roleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    role: 'anonymous',
    isLoading: true,
    isInitialized: false,
    isRoleLoading: false,
  });

  const isAuthenticated = useMemo(() => !!authState.user, [authState.user]);

  // Profile management
  const setProfile = useCallback((profile: Profile | null) => {
    setAuthState((prev) => ({ ...prev, profile }));
  }, []);

  const { loadUserProfile, updateProfile, refreshProfile } = useProfileActions(
    authState.user?.id,
    setProfile
  );

  // Role loading — single RPC, cached in memory, with timeout protection
  const loadUserRole = useCallback(async (): Promise<AppRole> => {
    setAuthState((prev) => ({ ...prev, isRoleLoading: true }));
    
    // Timeout protection: if RPC takes >5s, fallback to 'user'
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<AppRole>((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn('[AUTH_SESSION_EVENT] Role RPC timed out after 5s, fallback to user');
        resolve('user');
      }, 5000);
    });
    
    const role = await Promise.race([fetchUserRole(), timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    
    setAuthState((prev) => {
      if (prev.role !== role) {
        logRoleResolved(prev.user?.id ?? 'unknown', role, 'get_user_role');
        return { ...prev, role, isRoleLoading: false };
      }
      return { ...prev, isRoleLoading: false };
    });
    return role;
  }, []);

  // Refresh role — exposed to consumers
  const refreshRole = useCallback(async (): Promise<AppRole> => {
    return loadUserRole();
  }, [loadUserRole]);

  // Live role sync: window focus + interval
  useEffect(() => {
    if (!authState.user) return;

    const handleFocus = () => {
      loadUserRole();
    };

    window.addEventListener('focus', handleFocus);
    roleIntervalRef.current = setInterval(loadUserRole, ROLE_REFRESH_INTERVAL);

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (roleIntervalRef.current) clearInterval(roleIntervalRef.current);
    };
  }, [authState.user?.id, loadUserRole]);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    // Guard: ignore onAuthStateChange events until initAuth() completes
    const initDone = { current: false };

    // Safety timeout — if init hasn't completed in 4s, force resolve
    const safetyTimeout = setTimeout(async () => {
      if (!isMounted || initDone.current) return;
      console.warn('[AUTH_SESSION_EVENT] Init timed out after 4s, forcing ready');
      initDone.current = true;
      setAuthState((prev) =>
        prev.isLoading ? { ...prev, isLoading: false, isInitialized: true } : prev
      );
    }, 4000);

    // Auth state listener — guarded by initDone
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      console.info(`[AUTH_EVENT] ${event}, session=${session ? 'exists' : 'null'}, initDone=${initDone.current}, tab=${window.location.pathname}`);

      // Ignore INITIAL_SESSION — we handle it ourselves in initAuth()
      if (event === 'INITIAL_SESSION') return;

      // Before init completes, only process explicit SIGNED_IN / SIGNED_OUT
      if (!initDone.current && event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') {
        console.info('[AUTH_EVENT] Skipped (init not done):', event);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        if (!session) {
          console.warn('[AUTH_SESSION_EVENT] Token refresh failed');
          profileCache.invalidate();
          setAuthState({
            user: null, session: null, profile: null, role: 'anonymous',
            isLoading: false, isInitialized: true, isRoleLoading: false,
          });
          initializeWishlistStore(null);
        } else {
          // Token refreshed successfully — update session silently
          setAuthState((prev) => ({ ...prev, session, user: session.user }));
        }
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        setAuthState((prev) => ({
          ...prev,
          session,
          user: session.user,
          isLoading: false,
          isInitialized: true,
        }));
        initializeWishlistStore(session.user.id);
        setTimeout(() => {
          if (isMounted) {
            loadUserProfile(session.user.id);
            loadUserRole();
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        initializeWishlistStore(null);
        profileCache.invalidate();
        if (roleIntervalRef.current) clearInterval(roleIntervalRef.current);
        setAuthState({
          user: null, session: null, profile: null, role: 'anonymous',
          isLoading: false, isInitialized: true, isRoleLoading: false,
        });
        if ('caches' in self) {
          caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
        }
      }
    });

    // Cross-tab sync
    let authChannel: BroadcastChannel | null = null;
    try {
      authChannel = new BroadcastChannel('auth-sync');
      authChannel.onmessage = (event) => {
        if (!isMounted) return;
        if (event.data?.type === 'SIGNED_OUT') {
          logSessionEvent('CROSS_TAB_SIGNOUT');
          profileCache.invalidate();
          if (roleIntervalRef.current) clearInterval(roleIntervalRef.current);
          setAuthState({
            user: null, session: null, profile: null, role: 'anonymous',
            isLoading: false, isInitialized: true, isRoleLoading: false,
          });
          initializeWishlistStore(null);
        } else if (event.data?.type === 'SIGNED_IN') {
          logSessionEvent('CROSS_TAB_SIGNIN');
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user && isMounted) {
              setAuthState((prev) => ({
                ...prev, session, user: session.user,
                isLoading: false, isInitialized: true,
              }));
              initializeWishlistStore(session.user.id);
              loadUserProfile(session.user.id);
              loadUserRole();
            }
          });
        }
      };
    } catch { /* BroadcastChannel not supported */ }

    // Initial session check — runs ONCE, sets initDone when complete
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Validate JWT is still valid
          const { error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.warn('[AUTH_SESSION_EVENT] JWT invalid, clearing:', userError.message);
            cleanupAuthState();
            await supabase.auth.signOut({ scope: 'local' });
            if (isMounted) {
              setAuthState({
                user: null, session: null, profile: null, role: 'anonymous',
                isLoading: false, isInitialized: true, isRoleLoading: false,
              });
            }
            initDone.current = true;
            return;
          }

          if (isMounted) {
            logSessionEvent('SESSION_RESTORED', session.user.id);
            setAuthState((prev) => ({
              ...prev, session, user: session.user,
              isLoading: false, isInitialized: true,
            }));
            initializeWishlistStore(session.user.id);
            loadUserProfile(session.user.id);
            loadUserRole();
          }
        } else {
          if (isMounted) {
            setAuthState((prev) => ({
              ...prev, session: null, user: null, role: 'anonymous',
              isLoading: false, isInitialized: true,
            }));
          }
        }
      } catch (error) {
        console.error('[AUTH_SESSION_EVENT] Init error:', error);
        if (isMounted) {
          setAuthState((prev) => ({ ...prev, isLoading: false, isInitialized: true }));
        }
      } finally {
        initDone.current = true;
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      if (roleIntervalRef.current) clearInterval(roleIntervalRef.current);
      try { authChannel?.close(); } catch { /* ignore */ }
    };
  }, [loadUserProfile, loadUserRole]);

  // ============= Auth Methods =============
  const signIn = useCallback(async (email: string, password: string) => {
    cleanupAuthState();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    logSessionEvent('SIGNED_IN', data.user?.id);
    try {
      const ch = new BroadcastChannel('auth-sync');
      ch.postMessage({ type: 'SIGNED_IN', userId: data.user?.id });
      ch.close();
    } catch { /* ignore */ }
    return data;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string, phone?: string) => {
    cleanupAuthState();
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, phone: phone || null },
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    try {
      cleanupAuthState();
      profileCache.invalidate();
      if (roleIntervalRef.current) clearInterval(roleIntervalRef.current);

      setAuthState({
        user: null, session: null, profile: null, role: 'anonymous',
        isLoading: false, isInitialized: true, isRoleLoading: false,
      });
      initializeWishlistStore(null);

      try { queryClient?.clear(); } catch { /* ignore */ }

      await supabase.auth.signOut({ scope: 'local' });
      logSessionEvent('SIGNED_OUT');

      try {
        const ch = new BroadcastChannel('auth-sync');
        ch.postMessage({ type: 'SIGNED_OUT' });
        ch.close();
      } catch { /* ignore */ }
    } catch (error) {
      console.error('[AUTH_SESSION_EVENT] Sign out error:', error);
      setAuthState({
        user: null, session: null, profile: null, role: 'anonymous',
        isLoading: false, isInitialized: true, isRoleLoading: false,
      });
      throw error;
    }
  }, [queryClient]);

  const signInWithOtp = useCallback(async (email: string, options?: { shouldCreateUser?: boolean }): Promise<AuthOtpResponse> => {
    cleanupAuthState();
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        shouldCreateUser: options?.shouldCreateUser ?? true,
      },
    });
    if (error) throw error;
    return { data, error };
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string, _type: 'email' | 'sms' = 'email') => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
    return data;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  // ============= Context Value =============
  const value = useMemo<AuthContextType>(
    () => ({
      ...authState,
      isAuthenticated,
      signIn, signUp, signOut, signInWithOtp, verifyOtp,
      resetPassword, updatePassword, updateProfile, refreshProfile, refreshRole,
    }),
    [
      authState, isAuthenticated, signIn, signUp, signOut,
      signInWithOtp, verifyOtp, resetPassword, updatePassword,
      updateProfile, refreshProfile, refreshRole,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============= Hook =============
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Alias for backward compatibility
export const useOptimizedAuth = useAuth;
