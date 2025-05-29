// File_name : src/types/userTypes.ts

import { ContactInfo, Address } from './commonTypes';

export type UserRole = 'customer' | 'admin' | 'manager';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface UserCredentials {
  email: string;
  password: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  birthDate?: string;
  preferredLanguage: 'fr' | 'en';
  newsletter: boolean;
  marketingConsent: boolean;
}

export interface User extends ContactInfo {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLogin: string;
  profile: UserProfile;
  addresses: Address[];
  orders: string[];
  wishlist: string[];
  sessionToken: string;
  refreshToken: string;
  tokenExpires: string;
}

export interface LoginResponse {
  user: Omit<User, 'passwordHash' | 'sessionToken' | 'refreshToken'>;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: UserCredentials) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  register: (userData: Omit<User, 'id' | 'passwordHash' | 'createdAt' | 'lastLogin'>) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (userId: string, updates: Partial<UserProfile>) => Promise<User>;
  updatePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<void>;
}
