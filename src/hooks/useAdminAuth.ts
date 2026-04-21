// src/hooks/useAdminAuth.ts
// Admin auth hook — derives admin status from AuthContext role (user_roles table)
// No longer queries admin_users table for authorization

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { canAdmin, logAccessDenied } from '@/lib/rbac';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super-admin';
  lastLogin: string;
}

export const useAdminAuth = () => {
  const {
    user,
    role,
    isLoading: authLoading,
    isRoleLoading,
    refreshRole,
  } = useAuth();

  const isLoading = authLoading || isRoleLoading;
  const isAuthenticated = useMemo(() => canAdmin(role), [role]);

  const adminUser: AdminUser | null = useMemo(() => {
    if (!user || !isAuthenticated) return null;
    return {
      id: user.id,
      email: user.email ?? '',
      name: user.user_metadata?.full_name ?? user.email ?? '',
      role: role === 'super_admin' ? 'super-admin' : 'admin',
      lastLogin: new Date().toISOString(),
    };
  }, [user, isAuthenticated, role]);

  // Re-verify by refreshing role from RPC
  const reverifyAdmin = async (): Promise<boolean> => {
    try {
      const freshRole = await refreshRole();
      const result = canAdmin(freshRole);
      if (!result) {
        logAccessDenied(freshRole, 'reverifyAdmin');
      }
      return result;
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
    updateProfile: async () => {
      throw new Error('Use AuthContext updateProfile');
    },
  };
};
