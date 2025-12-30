// src/hooks/useAuth.ts
// DEPRECATED: This file is kept for backward compatibility
// All auth functionality has been consolidated into src/context/AuthContext.tsx

export { useAuth, useOptimizedAuth, cleanupAuthState, AuthProvider } from '@/context/AuthContext';
export type { AuthState, Profile } from '@/context/AuthContext';