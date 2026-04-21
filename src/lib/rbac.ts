// src/lib/rbac.ts
// Centralized RBAC helpers — single source of truth for role checks

export type AppRole = 'anonymous' | 'user' | 'admin' | 'super_admin';

const ROLE_HIERARCHY: Record<AppRole, number> = {
  anonymous: 0,
  user: 1,
  admin: 2,
  super_admin: 3,
};

/** Check if role meets minimum required level */
export function hasMinRole(current: AppRole, required: AppRole): boolean {
  return ROLE_HIERARCHY[current] >= ROLE_HIERARCHY[required];
}

/** Check if current role is admin or super_admin */
export function canAdmin(role: AppRole): boolean {
  return hasMinRole(role, 'admin');
}

/** Check if current role is at least user (authenticated) */
export function canUser(role: AppRole): boolean {
  return hasMinRole(role, 'user');
}

/** Check if current role is super_admin */
export function canSuperAdmin(role: AppRole): boolean {
  return role === 'super_admin';
}

// ============= Structured Auth Logging =============
export function logRoleResolved(userId: string, role: AppRole, source: string) {
  console.info('[AUTH_ROLE_RESOLVED]', { userId, role, source, timestamp: new Date().toISOString() });
}

export function logAccessDenied(role: AppRole, action: string) {
  console.warn('[AUTH_ACCESS_DENIED]', { role, action, timestamp: new Date().toISOString() });
}

export function logSessionEvent(event: string, userId?: string) {
  console.info('[AUTH_SESSION_EVENT]', { event, userId, timestamp: new Date().toISOString() });
}
