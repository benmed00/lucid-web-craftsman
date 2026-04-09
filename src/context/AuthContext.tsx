// src/context/AuthContext.tsx
// Unified Authentication Context - consolidates useAuth and useOptimizedAuth

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { User, Session, AuthOtpResponse } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { initializeWishlistStore } from '@/stores';
import { useQueryClient } from '@tanstack/react-query';
import { profileCache, useProfileActions } from './useProfileManager';

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

export type AppRole = 'anonymous' | 'user' | 'admin' | 'super_admin';

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
}

interface AuthContextType extends AuthState {
  isAuthenticated: boolean;
  // Auth methods
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
  // OTP methods
  signInWithOtp: (
    email: string,
    options?: { shouldCreateUser?: boolean }
  ) => Promise<AuthOtpResponse>;
  verifyOtp: (
    email: string,
    token: string,
    type?: 'email' | 'sms'
  ) => Promise<{ user: User | null; session: Session | null }>;
  // Password methods
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  // Profile methods
  updateProfile: (profileData: Partial<Profile>) => Promise<Profile>;
  refreshProfile: () => Promise<Profile | null>;
}

// ============= Context =============
const AuthContext = createContext<AuthContextType | null>(null);

// ============= Provider =============
export function AuthProvider({ children }: { children: ReactNode }) {
  // useQueryClient is safe here because AuthProvider is always rendered
  // inside QueryClientProvider (see App.tsx). Never wrap hooks in try/catch.
  const queryClient = useQueryClient();

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    role: 'anonymous',
    isLoading: true,
    isInitialized: false,
  });

  const isAuthenticated = useMemo(() => !!authState.user, [authState.user]);

  // Profile management (extracted to useProfileManager)
  const setProfile = useCallback((profile: Profile | null) => {
    setAuthState((prev) => ({ ...prev, profile }));
  }, []);

  const { loadUserProfile, updateProfile, refreshProfile } = useProfileActions(
    authState.user?.id,
    setProfile
  );

  // Role loading from backend RPC
  const loadUserRole = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_role');
      if (error) {
        console.warn('[AuthContext] Failed to load role:', error.message);
        return;
      }
      const role = (data as string) as AppRole;
      console.info('[AuthContext] Role detected:', role);
      setAuthState((prev) => ({ ...prev, role }));
    } catch (err) {
      console.warn('[AuthContext] Role detection error:', err);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: force isLoading to false after 4s, with one retry
    let retried = false;
    const safetyTimeout = setTimeout(async () => {
      if (!isMounted) return;

      // Check current state — skip if already initialized
      const alreadyDone = await new Promise<boolean>((resolve) => {
        setAuthState((prev) => {
          resolve(!prev.isLoading);
          return prev;
        });
      });
      if (alreadyDone) return;

      // One retry before giving up
      if (!retried) {
        retried = true;
        console.warn(
          '[AuthContext] Auth initialization slow, retrying getSession...'
        );
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (isMounted && session?.user) {
            setAuthState((prev) => ({
              ...prev,
              session,
              user: session.user,
              isLoading: false,
              isInitialized: true,
            }));
            loadUserProfile(session.user.id);
            return;
          }
        } catch {
          /* ignore retry error */
        }
      }

      setAuthState((prev) => {
        if (prev.isLoading) {
          console.warn(
            '[AuthContext] Auth initialization timed out after 4s, forcing ready state'
          );
          return { ...prev, isLoading: false, isInitialized: true };
        }
        return prev;
      });
    }, 4000);

    // Set up auth state listener FIRST (to not miss any events)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      // Handle token refresh errors — force re-login
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('[AuthContext] Token refresh failed, clearing session');
        profileCache.invalidate();
        setAuthState({
          user: null,
          session: null,
          profile: null,
          role: 'anonymous',
          isLoading: false,
          isInitialized: true,
        });
        initializeWishlistStore(null);
        return;
      }

      // Synchronous state updates only
      setAuthState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        isLoading: false,
        isInitialized: true,
      }));

      // Defer profile loading to prevent deadlocks
      if (event === 'SIGNED_IN' && session?.user) {
        // Initialize wishlist store with user ID
        initializeWishlistStore(session.user.id);

        setTimeout(() => {
          if (isMounted) {
            loadUserProfile(session.user.id);
            loadUserRole();
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        // Clear wishlist store
        initializeWishlistStore(null);

        profileCache.invalidate();
        setAuthState((prev) => ({ ...prev, profile: null, role: 'anonymous' }));

        // Purge Service Worker caches to prevent stale authenticated content
        if ('caches' in self) {
          caches
            .keys()
            .then((names) => names.forEach((name) => caches.delete(name)));
        }
      } else if (event === 'SIGNED_IN') {
        // Invalidate any cached HTML by purging SW caches (images will re-cache on demand)
        if ('caches' in self) {
          caches.keys().then((names) => {
            names.forEach((name) => {
              if (!name.includes('images')) caches.delete(name);
            });
          });
        }
      }
    });

    // Cross-tab auth sync via BroadcastChannel
    let authChannel: BroadcastChannel | null = null;
    try {
      authChannel = new BroadcastChannel('auth-sync');
      authChannel.onmessage = (event) => {
        if (event.data?.type === 'SIGNED_OUT' && isMounted) {
          profileCache.invalidate();
          setAuthState({
            user: null,
            session: null,
            profile: null,
            role: 'anonymous',
            isLoading: false,
            isInitialized: true,
          });
          initializeWishlistStore(null);
        } else if (event.data?.type === 'SIGNED_IN' && isMounted) {
          // Refresh session from Supabase to pick up new auth state
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user && isMounted) {
              setAuthState((prev) => ({
                ...prev,
                session,
                user: session.user,
                isLoading: false,
                isInitialized: true,
              }));
              initializeWishlistStore(session.user.id);
              loadUserProfile(session.user.id);
            }
          });
        }
      };
    } catch {
      // BroadcastChannel not supported — silent fallback
    }

    // THEN check for existing session
    // Note: onAuthStateChange fires for existing sessions too, but we also
    // call getSession() as a fast synchronous read from localStorage to
    // reduce perceived loading time. getUser() is deferred to background
    // to avoid blocking init with a network round-trip.
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // Validate JWT BEFORE trusting the session — a stale token
          // poisons ALL Supabase requests (including anonymous ones) with 401.
          // Do this SYNCHRONOUSLY in init, not deferred to background.
          const { error: userError } = await supabase.auth.getUser();

          if (userError) {
            // JWT is invalid — clear it immediately
            console.warn(
              '[AuthContext] Session JWT invalid, clearing immediately:',
              userError.message
            );
            cleanupAuthState();
            await supabase.auth.signOut({ scope: 'local' });
            if (isMounted) {
              setAuthState({
                user: null,
                session: null,
                profile: null,
                role: 'anonymous',
                isLoading: false,
                isInitialized: true,
              });
            }
            return;
          }

          // JWT is valid — trust the session
          if (isMounted) {
            setAuthState((prev) => ({
              ...prev,
              session,
              user: session.user,
              isLoading: false,
              isInitialized: true,
            }));
            initializeWishlistStore(session.user.id);
            loadUserProfile(session.user.id);
            loadUserRole();
          }
        } else {
          // No session at all
          if (isMounted) {
            setAuthState((prev) => ({
              ...prev,
              session: null,
              user: null,
              role: 'anonymous',
              isLoading: false,
              isInitialized: true,
            }));
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setAuthState((prev) => ({
            ...prev,
            isLoading: false,
            isInitialized: true,
          }));
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      try {
        authChannel?.close();
      } catch {
        /* ignore */
      }
    };
  }, [loadUserProfile, loadUserRole]);

  // ============= Auth Methods =============
  const signIn = useCallback(async (email: string, password: string) => {
    // Only clean up local storage tokens — do NOT call signOut({ scope: 'global' })
    // as that revokes sessions in ALL tabs/devices, which is destructive and unnecessary.
    cleanupAuthState();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Notify other tabs about the new session
    try {
      const ch = new BroadcastChannel('auth-sync');
      ch.postMessage({ type: 'SIGNED_IN', userId: data.user?.id });
      ch.close();
    } catch {
      /* BroadcastChannel not supported */
    }

    return data;
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      phone?: string
    ) => {
      cleanupAuthState();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            phone: phone || null,
          },
        },
      });

      if (error) throw error;
      return data;
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      // 1. Clear auth storage tokens
      cleanupAuthState();
      profileCache.invalidate();

      // 2. Reset React state immediately (don't wait for listener)
      setAuthState({
        user: null,
        session: null,
        profile: null,
        role: 'anonymous',
        isLoading: false,
        isInitialized: true,
      });

      // 3. Clear wishlist store
      initializeWishlistStore(null);

      // 4. Clear React Query cache to remove stale data
      try {
        queryClient?.clear();
      } catch {
        /* ignore if no QueryClient */
      }

      // 5. Sign out from Supabase (local scope only)
      await supabase.auth.signOut({ scope: 'local' });

      // 6. Notify other tabs
      try {
        const ch = new BroadcastChannel('auth-sync');
        ch.postMessage({ type: 'SIGNED_OUT' });
        ch.close();
      } catch {
        /* ignore */
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if signOut fails, ensure state is cleared
      setAuthState({
        user: null,
        session: null,
        profile: null,
        role: 'anonymous',
        isLoading: false,
        isInitialized: true,
      });
      throw error;
    }
  }, [queryClient]);

  const signInWithOtp = useCallback(
    async (
      email: string,
      options?: { shouldCreateUser?: boolean }
    ): Promise<AuthOtpResponse> => {
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
    },
    []
  );

  const verifyOtp = useCallback(
    async (email: string, token: string, _type: 'email' | 'sms' = 'email') => {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;
      return data;
    },
    []
  );

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }, []);

  // updateProfile and refreshProfile are provided by useProfileActions above

  // ============= Context Value =============
  const value = useMemo<AuthContextType>(
    () => ({
      ...authState,
      isAuthenticated,
      signIn,
      signUp,
      signOut,
      signInWithOtp,
      verifyOtp,
      resetPassword,
      updatePassword,
      updateProfile,
      refreshProfile,
    }),
    [
      authState,
      isAuthenticated,
      signIn,
      signUp,
      signOut,
      signInWithOtp,
      verifyOtp,
      resetPassword,
      updatePassword,
      updateProfile,
      refreshProfile,
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
