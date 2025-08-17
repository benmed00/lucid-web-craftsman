import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Session, AuthOtpResponse } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Enhanced auth state cleanup utility
export const cleanupAuthState = () => {
  // Remove all Supabase auth keys from localStorage and sessionStorage
  const storages = [localStorage, sessionStorage];
  storages.forEach(storage => {
    Object.keys(storage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.startsWith('sb-')) {
        storage.removeItem(key);
      }
    });
  });
};

// Cache for user profile data with TTL
class ProfileCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl = this.defaultTTL) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear() {
    this.cache.clear();
  }
}

const profileCache = new ProfileCache();

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: any | null;
  isLoading: boolean;
  isInitialized: boolean;
}

export const useOptimizedAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isInitialized: false,
  });

  // Memoized auth check
  const isAuthenticated = useMemo(() => !!authState.user, [authState.user]);

  // Load user profile with caching
  const loadUserProfile = useCallback(async (userId: string) => {
    const cacheKey = `profile_${userId}`;
    const cachedProfile = profileCache.get(cacheKey);
    
    if (cachedProfile) {
      setAuthState(prev => ({ ...prev, profile: cachedProfile }));
      return cachedProfile;
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

      const profile = data || null;
      profileCache.set(cacheKey, profile);
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

    const initAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isMounted) {
          setAuthState(prev => ({
            ...prev,
            session,
            user: session?.user ?? null,
            isLoading: false,
            isInitialized: true,
          }));

          // Load profile if user exists
          if (session?.user) {
            setTimeout(() => loadUserProfile(session.user.id), 0);
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

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          isLoading: false,
        }));

        // Handle different auth events
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => loadUserProfile(session.user.id), 0);
        } else if (event === 'SIGNED_OUT') {
          profileCache.clear();
          setAuthState(prev => ({ ...prev, profile: null }));
        }
      }
    );

    initAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  // Optimized sign in
  const signIn = useCallback(async (email: string, password: string) => {
    cleanupAuthState();
    
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      // Continue even if this fails
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }, []);

  // Sign in with OTP
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

  // Verify OTP
  const verifyOtp = useCallback(async (
    email: string, 
    token: string, 
    type: 'email' | 'sms' = 'email'
  ) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email', // Fixed type issue
    });

    if (error) throw error;
    return data;
  }, []);

  // Sign up with enhanced options
  const signUp = useCallback(async (
    email: string, 
    password: string, 
    fullName: string,
    phone?: string
  ) => {
    cleanupAuthState();
    
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      // Continue even if this fails
    }

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

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
    return data;
  }, []);

  // Update password
  const updatePassword = useCallback(async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return data;
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      cleanupAuthState();
      profileCache.clear();
      
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  // Update profile with cache invalidation
  const updateProfile = useCallback(async (profileData: any) => {
    if (!authState.user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', authState.user.id)
      .select()
      .single();

    if (error) throw error;

    // Update cache and state
    const cacheKey = `profile_${authState.user.id}`;
    profileCache.set(cacheKey, data);
    setAuthState(prev => ({ ...prev, profile: data }));

    return data;
  }, [authState.user]);

  return {
    ...authState,
    isAuthenticated,
    signIn,
    signInWithOtp,
    verifyOtp,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile: () => authState.user ? loadUserProfile(authState.user.id) : null,
  };
};