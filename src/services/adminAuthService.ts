import { supabase } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super-admin';
  lastLogin: string;
}

const ADMIN_AUTH_KEY = 'adminAuth';
const ADMIN_SESSION_KEY = 'adminSession';

export const adminAuthService = {
  login: async (email: string, password: string): Promise<AdminUser> => {
    try {
      // Query admin user from database
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !adminUser) {
        throw new Error('Email ou mot de passe incorrect');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, adminUser.password_hash);
      if (!isPasswordValid) {
        throw new Error('Email ou mot de passe incorrect');
      }

      // Update last login
      await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', adminUser.id);

      const user: AdminUser = {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role as 'admin' | 'super-admin',
        lastLogin: new Date().toISOString()
      };
      
      localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(user));
      localStorage.setItem(ADMIN_SESSION_KEY, 'authenticated');
      
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Email ou mot de passe incorrect');
    }
  },

  logout: (): void => {
    localStorage.removeItem(ADMIN_AUTH_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
  },

  getCurrentUser: (): AdminUser | null => {
    try {
      const session = localStorage.getItem(ADMIN_SESSION_KEY);
      const userStr = localStorage.getItem(ADMIN_AUTH_KEY);
      
      if (session && userStr) {
        return JSON.parse(userStr);
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(ADMIN_SESSION_KEY);
  },

  updateProfile: async (updates: Partial<AdminUser>): Promise<AdminUser> => {
    const currentUser = adminAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      // Update in database
      const { error } = await supabase
        .from('admin_users')
        .update({ 
          name: updates.name || currentUser.name,
          role: updates.role || currentUser.role
        })
        .eq('id', currentUser.id);

      if (error) {
        throw new Error('Erreur lors de la mise à jour du profil');
      }

      const updatedUser = { ...currentUser, ...updates };
      localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw new Error('Erreur lors de la mise à jour du profil');
    }
  }
};