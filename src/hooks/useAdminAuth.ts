import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super-admin';
  lastLogin: string;
}

export const useAdminAuth = () => {
  const { user, session, isLoading: authLoading } = useAuth();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const hasCheckedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      // If auth is still loading, keep loading
      if (authLoading) {
        return;
      }

      // If no user, clear admin state
      if (!user) {
        setAdminUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        hasCheckedRef.current = false;
        currentUserIdRef.current = null;
        return;
      }

      // Avoid unnecessary checks for the same user
      if (hasCheckedRef.current && currentUserIdRef.current === user.id) {
        return;
      }

      setIsLoading(true);
      currentUserIdRef.current = user.id;

      try {
        // Check if user has admin profile
        const { data: adminProfile, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error || !adminProfile) {
          setAdminUser(null);
          setIsAuthenticated(false);
        } else {
          const admin: AdminUser = {
            id: adminProfile.id,
            email: adminProfile.email,
            name: adminProfile.name,
            role: adminProfile.role as 'admin' | 'super-admin',
            lastLogin: adminProfile.last_login || new Date().toISOString()
          };
          setAdminUser(admin);
          setIsAuthenticated(true);
          
          // Update last login silently (don't wait for it)
          supabase
            .from('admin_users')
            .update({ last_login: new Date().toISOString() })
            .eq('user_id', user.id);
        }
        
        hasCheckedRef.current = true;
      } catch (error) {
        console.error('Error checking admin status:', error);
        setAdminUser(null);
        setIsAuthenticated(false);
        hasCheckedRef.current = true;
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user?.id, authLoading]); // Only depend on user.id, not the whole user object

  const updateProfile = async (updates: Partial<AdminUser>) => {
    if (!user || !adminUser) throw new Error('No admin user logged in');
    
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({
          name: updates.name || adminUser.name,
          role: updates.role || adminUser.role
        })
        .eq('user_id', user.id);

      if (error) throw error;

      const updatedAdmin = { ...adminUser, ...updates };
      setAdminUser(updatedAdmin);
      return updatedAdmin;
    } catch (error) {
      console.error('Error updating admin profile:', error);
      throw new Error('Erreur lors de la mise à jour du profil');
    }
  };

  return {
    user: adminUser,
    isLoading,
    isAuthenticated,
    login: () => {
      throw new Error('Use regular auth login instead');
    },
    logout: () => {
      throw new Error('Use regular auth logout instead');
    },
    updateProfile
  };
};