// src/hooks/useAuth.ts
// Re-export from AuthContext for backward compatibility

export {
  useAuth,
  useOptimizedAuth,
  cleanupAuthState,
  AuthProvider,
} from '@/context/AuthContext';
export type { AuthState, Profile, AppRole } from '@/context/AuthContext';
