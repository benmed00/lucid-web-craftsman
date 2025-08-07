import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user || authLoading) {
        setAdminUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

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
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setAdminUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user, authLoading]);

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