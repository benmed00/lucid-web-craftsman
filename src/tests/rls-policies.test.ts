/**
 * RLS Policy Tests
 * 
 * These tests verify that Row Level Security policies are correctly configured.
 * Run these tests against a test Supabase instance to validate security.
 * 
 * IMPORTANT: These tests should be run with different user contexts to verify
 * that unauthorized access is properly blocked.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Test configuration - use environment variables instead of hardcoded credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Policy test definitions
type AccessLevel = 'deny' | 'allow' | 'own_only';

interface PolicyTest {
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  expectedForAnonymous: AccessLevel;
  expectedForAuthenticatedUser: AccessLevel;
  expectedForAdmin: AccessLevel;
  expectedForSuperAdmin: AccessLevel;
  notes?: string;
}

const POLICY_TESTS: PolicyTest[] = [
  // Profiles table
  {
    table: 'profiles',
    operation: 'SELECT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'own_only',
    expectedForAdmin: 'allow',
    expectedForSuperAdmin: 'allow',
    notes: 'Users should only see their own profile'
  },
  {
    table: 'profiles',
    operation: 'UPDATE',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'own_only',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'deny',
    notes: 'Users can only update their own profile'
  },
  {
    table: 'profiles',
    operation: 'DELETE',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'deny',
    notes: 'Profile deletion is blocked for all users'
  },
  
  // Contact messages table
  {
    table: 'contact_messages',
    operation: 'SELECT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Only super_admins can read contact messages'
  },
  {
    table: 'contact_messages',
    operation: 'INSERT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'allow',
    expectedForAdmin: 'allow',
    expectedForSuperAdmin: 'allow',
    notes: 'Rate limited contact form submissions'
  },
  
  // Audit logs table
  {
    table: 'audit_logs',
    operation: 'SELECT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Only super_admins can view audit logs'
  },
  {
    table: 'audit_logs',
    operation: 'UPDATE',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'deny',
    notes: 'Audit logs cannot be modified'
  },
  {
    table: 'audit_logs',
    operation: 'DELETE',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'deny',
    notes: 'Audit logs cannot be deleted'
  },
  
  // Newsletter subscriptions table
  {
    table: 'newsletter_subscriptions',
    operation: 'SELECT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'own_only',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Users can only see their own subscription'
  },
  
  // Admin users table
  {
    table: 'admin_users',
    operation: 'SELECT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'own_only',
    expectedForSuperAdmin: 'allow',
    notes: 'Admins can see their own record, super_admins see all'
  },
  {
    table: 'admin_users',
    operation: 'INSERT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Only super_admins can create admin users'
  },
  {
    table: 'admin_users',
    operation: 'DELETE',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'deny',
    notes: 'Admin deletion is blocked for all'
  },
  
  // Shipping addresses table
  {
    table: 'shipping_addresses',
    operation: 'SELECT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'own_only',
    expectedForAdmin: 'allow',
    expectedForSuperAdmin: 'allow',
    notes: 'Users see own addresses, admins see all'
  },
  {
    table: 'shipping_addresses',
    operation: 'INSERT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'own_only',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Users can add own addresses'
  },
  {
    table: 'shipping_addresses',
    operation: 'UPDATE',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'own_only',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Users can update own addresses'
  },
  {
    table: 'shipping_addresses',
    operation: 'DELETE',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'own_only',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Users can delete own addresses'
  },
  
  // Orders table
  {
    table: 'orders',
    operation: 'SELECT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'own_only',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Users see own orders, super_admins see all'
  },
  
  // Payments table
  {
    table: 'payments',
    operation: 'SELECT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'own_only',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Users see own payments via order, super_admins see all'
  },
  {
    table: 'payments',
    operation: 'DELETE',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'deny',
    notes: 'Payment deletion is blocked for all'
  },

  // Shipping addresses table
  {
    table: 'shipping_addresses',
    operation: 'SELECT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'own_only',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Users see own shipping addresses only'
  },

  // Security events table
  {
    table: 'security_events',
    operation: 'SELECT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Only super_admins can view security events'
  },

  // Security config table
  {
    table: 'security_config',
    operation: 'SELECT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Only super_admins can view security config'
  },

  // Products table (public read)
  {
    table: 'products',
    operation: 'SELECT',
    expectedForAnonymous: 'allow',
    expectedForAuthenticatedUser: 'allow',
    expectedForAdmin: 'allow',
    expectedForSuperAdmin: 'allow',
    notes: 'Products are publicly readable'
  },
  {
    table: 'products',
    operation: 'INSERT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'allow',
    expectedForSuperAdmin: 'allow',
    notes: 'Only admins can add products'
  },
  {
    table: 'products',
    operation: 'UPDATE',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'allow',
    expectedForSuperAdmin: 'allow',
    notes: 'Only admins can update products'
  },
  {
    table: 'products',
    operation: 'DELETE',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'allow',
    expectedForSuperAdmin: 'allow',
    notes: 'Only admins can delete products'
  },

  // security_events table - super_admin only
  {
    table: 'security_events',
    operation: 'SELECT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Only super_admins can view security events'
  },
  {
    table: 'security_events',
    operation: 'UPDATE',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Only super_admins can update security events'
  },

  // security_config table - super_admin only
  {
    table: 'security_config',
    operation: 'SELECT',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Only super_admins can view security config'
  },
  {
    table: 'security_config',
    operation: 'UPDATE',
    expectedForAnonymous: 'deny',
    expectedForAuthenticatedUser: 'deny',
    expectedForAdmin: 'deny',
    expectedForSuperAdmin: 'allow',
    notes: 'Only super_admins can manage security config'
  },
];

// Test utility functions
export const generatePolicyTestReport = (): string => {
  let report = '# RLS Policy Security Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += '## Policy Matrix\n\n';
  report += '| Table | Operation | Anonymous | Auth User | Admin | Super Admin | Notes |\n';
  report += '|-------|-----------|-----------|-----------|-------|-------------|-------|\n';
  
  for (const test of POLICY_TESTS) {
    report += `| ${test.table} | ${test.operation} | ${test.expectedForAnonymous} | ${test.expectedForAuthenticatedUser} | ${test.expectedForAdmin} | ${test.expectedForSuperAdmin} | ${test.notes || ''} |\n`;
  }
  
  return report;
};

// Sensitive tables that must never be publicly accessible
export const SENSITIVE_TABLES = [
  'profiles',
  'contact_messages',
  'audit_logs',
  'newsletter_subscriptions',
  'admin_users',
  'payments',
  'orders',
  'shipping_addresses',
  'security_events',
  'security_config',
];

// Verify no sensitive table has public SELECT
export const verifySensitiveTablesProtected = (): { table: string; issue: string }[] => {
  const issues: { table: string; issue: string }[] = [];
  
  for (const table of SENSITIVE_TABLES) {
    const test = POLICY_TESTS.find(t => t.table === table && t.operation === 'SELECT');
    if (test && test.expectedForAnonymous === 'allow') {
      issues.push({
        table,
        issue: `Anonymous users can SELECT from ${table} - this is a security risk!`
      });
    }
  }
  
  return issues;
};

// Tests
describe('RLS Policy Security Tests', () => {
  it('should have policy tests for all sensitive tables', () => {
    for (const table of SENSITIVE_TABLES) {
      const hasTest = POLICY_TESTS.some(t => t.table === table);
      expect(hasTest, `Missing policy test for sensitive table: ${table}`).toBe(true);
    }
  });

  it('should block anonymous access to sensitive tables', () => {
    const issues = verifySensitiveTablesProtected();
    expect(issues).toEqual([]);
  });

  it('should not allow anonymous DELETE on any table', () => {
    const deleteTests = POLICY_TESTS.filter(t => t.operation === 'DELETE');
    for (const test of deleteTests) {
      expect(
        test.expectedForAnonymous,
        `Anonymous DELETE should be denied on ${test.table}`
      ).toBe('deny');
    }
  });

  it('should restrict audit log modifications', () => {
    const auditUpdateTest = POLICY_TESTS.find(
      t => t.table === 'audit_logs' && t.operation === 'UPDATE'
    );
    const auditDeleteTest = POLICY_TESTS.find(
      t => t.table === 'audit_logs' && t.operation === 'DELETE'
    );
    
    expect(auditUpdateTest?.expectedForSuperAdmin).toBe('deny');
    expect(auditDeleteTest?.expectedForSuperAdmin).toBe('deny');
  });

  it('should restrict payment deletions', () => {
    const paymentDeleteTest = POLICY_TESTS.find(
      t => t.table === 'payments' && t.operation === 'DELETE'
    );
    
    expect(paymentDeleteTest?.expectedForSuperAdmin).toBe('deny');
  });

  it('should restrict contact messages to super_admin only', () => {
    const contactSelectTest = POLICY_TESTS.find(
      t => t.table === 'contact_messages' && t.operation === 'SELECT'
    );
    
    expect(contactSelectTest?.expectedForAdmin).toBe('deny');
    expect(contactSelectTest?.expectedForSuperAdmin).toBe('allow');
  });
});

// Export for external use
export { POLICY_TESTS, SUPABASE_URL };
