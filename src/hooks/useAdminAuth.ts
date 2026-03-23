import { useState, useEffect, useRef } from 'react';
import {
  fetchAdminIdLastLoginRow,
  fetchAdminUserFullRow,
  rpcVerifyAdminSession,
  touchAdminLastLogin,
  updateAdminUsersByUserId,
} from '@/services/adminAuthApi';
import { useAuth } from '@/hooks/useAuth';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super-admin';
  lastLogin: string;
}

export const useAdminAuth = () => {
  const { user, isLoading: authLoading } = useAuth();
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
        console.log('[useAdminAuth] Checking admin status for user:', user.id);

        // Use server-side verification function (cannot be spoofed via DevTools)
        const { data: verifyResult, error: verifyError } =
          await rpcVerifyAdminSession();

        console.log('[useAdminAuth] RPC result:', {
          verifyResult,
          verifyError,
        });

        if (verifyError) {
          console.error(
            '[useAdminAuth] Error verifying admin session:',
            verifyError
          );
          // Fallback to direct query if RPC fails
          const { data: adminProfile, error } = await fetchAdminUserFullRow(
            user.id
          );

          console.log('[useAdminAuth] Fallback query result:', {
            adminProfile,
            error,
          });

          if (error || !adminProfile) {
            setAdminUser(null);
            setIsAuthenticated(false);
          } else {
            const admin: AdminUser = {
              id: adminProfile.id,
              email: adminProfile.email,
              name: adminProfile.name,
              role: adminProfile.role as 'admin' | 'super-admin',
              lastLogin: adminProfile.last_login || new Date().toISOString(),
            };
            setAdminUser(admin);
            setIsAuthenticated(true);
          }
        } else if (
          verifyResult &&
          verifyResult.length > 0 &&
          verifyResult[0].is_admin
        ) {
          // Server verified admin status - this is secure
          const result = verifyResult[0];
          console.log('[useAdminAuth] Admin verified:', result);

          // Fetch full admin profile for additional details
          const { data: adminProfile } = await fetchAdminIdLastLoginRow(
            user.id
          );

          const admin: AdminUser = {
            id: adminProfile?.id || user.id,
            email: result.admin_email || user.email || '',
            name: result.admin_name || '',
            role: result.admin_role as 'admin' | 'super-admin',
            lastLogin: adminProfile?.last_login || new Date().toISOString(),
          };
          setAdminUser(admin);
          setIsAuthenticated(true);

          // Update last login silently (don't wait for it)
          touchAdminLastLogin(user.id);
        } else {
          // Server verified: not an admin
          console.log('[useAdminAuth] User is not an admin');
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
      const { error } = await updateAdminUsersByUserId(user.id, {
        name: updates.name || adminUser.name,
        role: updates.role || adminUser.role,
      });

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
      const { data: verifyResult, error } = await rpcVerifyAdminSession();
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
    updateProfile,
  };
};
