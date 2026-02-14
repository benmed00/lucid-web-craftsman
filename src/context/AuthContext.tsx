// src/context/AuthContext.tsx
// Unified Authentication Context - consolidates useAuth and useOptimizedAuth

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { User, Session, AuthOtpResponse } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { initializeWishlistStore } from '@/stores';

// ============= Auth State Cleanup Utility =============
export const cleanupAuthState = () => {
  const storages = [localStorage, sessionStorage];
  storages.forEach(storage => {
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

// ============= Profile Cache =============
class ProfileCache {
  private cache = new Map<string, { data: Profile | null; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set(userId: string, data: Profile | null) {
    this.cache.set(userId, { data, timestamp: Date.now() });
  }

  get(userId: string): Profile | null {
    const item = this.cache.get(userId);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.TTL) {
      this.cache.delete(userId);
      return null;
    }
    
    return item.data;
  }

  invalidate(userId?: string) {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }
}

const profileCache = new ProfileCache();

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
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthContextType extends AuthState {
  isAuthenticated: boolean;
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
  // OTP methods
  signInWithOtp: (email: string, options?: { shouldCreateUser?: boolean }) => Promise<AuthOtpResponse>;
  verifyOtp: (email: string, token: string, type?: 'email' | 'sms') => Promise<{ user: User | null; session: Session | null }>;
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
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isInitialized: false,
  });

  const isAuthenticated = useMemo(() => !!authState.user, [authState.user]);

  // Load user profile with caching
  const loadUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    // Check cache first
    const cached = profileCache.get(userId);
    if (cached) {
      setAuthState(prev => ({ ...prev, profile: cached }));
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const profile = data as Profile | null;
      profileCache.set(userId, profile);
      setAuthState(prev => ({ ...prev, profile }));
      return profile;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: force isLoading to false after 8s to prevent UI deadlock
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setAuthState(prev => {
          if (prev.isLoading) {
            console.warn('[AuthContext] Auth initialization timed out after 8s, forcing ready state');
            return { ...prev, isLoading: false, isInitialized: true };
          }
          return prev;
        });
      }
    }, 8000);

    // Set up auth state listener FIRST (to not miss any events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        // Handle token refresh errors — force re-login
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('[AuthContext] Token refresh failed, clearing session');
          profileCache.invalidate();
          setAuthState({
            user: null, session: null, profile: null,
            isLoading: false, isInitialized: true,
          });
          initializeWishlistStore(null);
          return;
        }

        // Synchronous state updates only
        setAuthState(prev => ({
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
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          // Clear wishlist store
          initializeWishlistStore(null);
          
          profileCache.invalidate();
          setAuthState(prev => ({ ...prev, profile: null }));
        }
      }
    );

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
            isLoading: false,
            isInitialized: true,
          });
          initializeWishlistStore(null);
        } else if (event.data?.type === 'SIGNED_IN' && isMounted) {
          // Refresh session from Supabase to pick up new auth state
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user && isMounted) {
              setAuthState(prev => ({
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
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isMounted) {
          setAuthState(prev => ({
            ...prev,
            session,
            user: session?.user ?? null,
            isLoading: false,
            isInitialized: true,
          }));

          if (session?.user) {
            // Initialize wishlist store with existing session
            initializeWishlistStore(session.user.id);
            loadUserProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setAuthState(prev => ({
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
      try { authChannel?.close(); } catch { /* ignore */ }
    };
  }, [loadUserProfile]);

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
    } catch { /* BroadcastChannel not supported */ }

    return data;
  }, []);

  const signUp = useCallback(async (
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
        }
      }
    });

    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    try {
      cleanupAuthState();
      profileCache.invalidate();
      // Use 'local' scope to only clear THIS browser's session.
      // Cross-tab sync is handled via BroadcastChannel below.
      // 'global' would revoke ALL sessions on ALL devices, which is too destructive for a normal logout.
      await supabase.auth.signOut({ scope: 'local' });
      // Notify other tabs in this browser
      try {
        const ch = new BroadcastChannel('auth-sync');
        ch.postMessage({ type: 'SIGNED_OUT' });
        ch.close();
      } catch { /* ignore */ }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  const signInWithOtp = useCallback(async (
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
  }, []);

  const verifyOtp = useCallback(async (
    email: string, 
    token: string, 
    type: 'email' | 'sms' = 'email'
  ) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

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
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }, []);

  const updateProfile = useCallback(async (profileData: Partial<Profile>): Promise<Profile> => {
    if (!authState.user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', authState.user.id)
      .select()
      .single();

    if (error) throw error;

    const profile = data as Profile;
    profileCache.set(authState.user.id, profile);
    setAuthState(prev => ({ ...prev, profile }));

    return profile;
  }, [authState.user]);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (!authState.user) return null;
    profileCache.invalidate(authState.user.id);
    return loadUserProfile(authState.user.id);
  }, [authState.user, loadUserProfile]);

  // ============= Context Value =============
  const value = useMemo<AuthContextType>(() => ({
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
  }), [
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
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
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
