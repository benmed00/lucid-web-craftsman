// Extracted profile management logic from AuthContext
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from './AuthContext';

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

export const profileCache = new ProfileCache();

// ============= Profile Hooks =============
export function useProfileActions(
  userId: string | undefined,
  setProfile: (profile: Profile | null) => void
) {
  const loadUserProfile = useCallback(
    async (uid: string): Promise<Profile | null> => {
      const cached = profileCache.get(uid);
      if (cached) {
        setProfile(cached);
        return cached;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        const profile = data as Profile | null;
        profileCache.set(uid, profile);
        setProfile(profile);
        return profile;
      } catch (error) {
        console.error('Error loading profile:', error);
        return null;
      }
    },
    [setProfile]
  );

  const updateProfile = useCallback(
    async (profileData: Partial<Profile>): Promise<Profile> => {
      if (!userId) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      const profile = data as Profile;
      profileCache.set(userId, profile);
      setProfile(profile);
      return profile;
    },
    [userId, setProfile]
  );

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (!userId) return null;
    profileCache.invalidate(userId);
    return loadUserProfile(userId);
  }, [userId, loadUserProfile]);

  return { loadUserProfile, updateProfile, refreshProfile };
}
