export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'super-admin';
  lastLogin: string;
}

const ADMIN_AUTH_KEY = 'adminAuth';
const ADMIN_SESSION_KEY = 'adminSession';

// Mock admin credentials - in production, this would be handled by Supabase
const MOCK_ADMIN = {
  email: 'admin@artisanrif.com',
  password: 'admin123',
  user: {
    id: '1',
    email: 'admin@artisanrif.com',
    name: 'Administrateur',
    role: 'admin' as const,
    lastLogin: new Date().toISOString()
  }
};

export const adminAuthService = {
  login: async (email: string, password: string): Promise<AdminUser> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (email === MOCK_ADMIN.email && password === MOCK_ADMIN.password) {
      const user = {
        ...MOCK_ADMIN.user,
        lastLogin: new Date().toISOString()
      };
      
      localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(user));
      localStorage.setItem(ADMIN_SESSION_KEY, 'authenticated');
      
      return user;
    } else {
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

    const updatedUser = { ...currentUser, ...updates };
    localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(updatedUser));
    
    return updatedUser;
  }
};