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
        // Use server-side verification function (cannot be spoofed via DevTools)
        const { data: verifyResult, error: verifyError } = await supabase
          .rpc('verify_admin_session');

        if (verifyError) {
          console.error('Error verifying admin session:', verifyError);
          // Fallback to direct query if RPC fails
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
        } else if (verifyResult && verifyResult.length > 0 && verifyResult[0].is_admin) {
          // Server verified admin status - this is secure
          const result = verifyResult[0];
          
          // Fetch full admin profile for additional details
          const { data: adminProfile } = await supabase
            .from('admin_users')
            .select('id, last_login')
            .eq('user_id', user.id)
            .single();

          const admin: AdminUser = {
            id: adminProfile?.id || user.id,
            email: result.admin_email || user.email || '',
            name: result.admin_name || '',
            role: result.admin_role as 'admin' | 'super-admin',
            lastLogin: adminProfile?.last_login || new Date().toISOString()
          };
          setAdminUser(admin);
          setIsAuthenticated(true);
          
          // Update last login silently (don't wait for it)
          supabase
            .from('admin_users')
            .update({ last_login: new Date().toISOString() })
            .eq('user_id', user.id);
        } else {
          // Server verified: not an admin
          setAdminUser(null);
          setIsAuthenticated(false);
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

  // Re-verify admin status on demand (for sensitive operations)
  const reverifyAdmin = async (): Promise<boolean> => {
    try {
      const { data: verifyResult, error } = await supabase.rpc('verify_admin_session');
      if (error || !verifyResult || verifyResult.length === 0) {
        setIsAuthenticated(false);
        setAdminUser(null);
        return false;
      }
      return verifyResult[0].is_admin === true;
    } catch {
      return false;
    }
  };

  return {
    user: adminUser,
    isLoading,
    isAuthenticated,
    reverifyAdmin,
    login: () => {
      throw new Error('Use regular auth login instead');
    },
    logout: () => {
      throw new Error('Use regular auth logout instead');
    },
    updateProfile
  };
};
