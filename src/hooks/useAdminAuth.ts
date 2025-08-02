import { useState, useEffect } from 'react';
import { adminAuthService, AdminUser } from '@/services/adminAuthService';

export const useAdminAuth = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const currentUser = adminAuthService.getCurrentUser();
      const authenticated = adminAuthService.isAuthenticated();
      
      setUser(currentUser);
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (logout from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'adminSession' || e.key === 'adminAuth') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await adminAuthService.login(email, password);
      setUser(user);
      setIsAuthenticated(true);
      return user;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    adminAuthService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateProfile = async (updates: Partial<AdminUser>) => {
    if (!user) throw new Error('No user logged in');
    
    const updatedUser = await adminAuthService.updateProfile(updates);
    setUser(updatedUser);
    return updatedUser;
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateProfile
  };
};