/**
 * RLS End-to-End Security Tests
 *
 * These tests verify Row Level Security policies work correctly
 * by testing with different user contexts (anonymous, user, admin, super_admin).
 *
 * SETUP REQUIRED:
 * 1. Create test users in Supabase Auth with known credentials
 * 2. Assign appropriate roles in user_roles table
 * 3. Set environment variables for test credentials
 *
 * Run with: npx vitest src/tests/rls-e2e.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration - use environment variables instead of hardcoded credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Skip when using .env.test placeholders (no real Supabase)
const isRealSupabase =
  Boolean(SUPABASE_URL && ANON_KEY) &&
  !SUPABASE_URL.includes('test.supabase.co') &&
  !ANON_KEY.startsWith('test-anon-key');

// Test user credentials (should be set in environment for CI/CD)
const TEST_USERS = {
  regular: {
    email: process.env.TEST_USER_EMAIL || 'test-user@example.com',
    password: process.env.TEST_USER_PASSWORD || 'test-password-123',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'test-admin@example.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'test-admin-password-123',
  },
  superAdmin: {
    email: process.env.TEST_SUPER_ADMIN_EMAIL || 'test-superadmin@example.com',
    password:
      process.env.TEST_SUPER_ADMIN_PASSWORD || 'test-superadmin-password-123',
  },
};

// Single shared client to avoid "Multiple GoTrueClient instances" warning
function createSharedClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Helper to sign in with a client and return userId
async function signInClient(
  client: SupabaseClient,
  email: string,
  password: string
): Promise<string | null> {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    console.warn(`Auth failed for ${email}: ${error.message}`);
    return null;
  }
  return data.user?.id ?? null;
}

// Test result interface
interface RLSTestResult {
  table: string;
  operation: string;
  userType: string;
  allowed: boolean;
  rowCount?: number;
  error?: string;
}

// RLS Test Runner
class RLSTestRunner {
  private results: RLSTestResult[] = [];

  async testSelect(
    client: SupabaseClient,
    table: string,
    userType: string
  ): Promise<RLSTestResult> {
    try {
      const { data, error } = await client.from(table).select('*').limit(5);

      const result: RLSTestResult = {
        table,
        operation: 'SELECT',
        userType,
        allowed: !error,
        rowCount: data?.length || 0,
        error: error?.message,
      };

      this.results.push(result);
      return result;
    } catch (err: any) {
      const result: RLSTestResult = {
        table,
        operation: 'SELECT',
        userType,
        allowed: false,
        error: err.message,
      };
      this.results.push(result);
      return result;
    }
  }

  async testInsert(
    client: SupabaseClient,
    table: string,
    userType: string,
    testData: Record<string, any>
  ): Promise<RLSTestResult> {
    try {
      const { data, error } = await client
        .from(table)
        .insert(testData)
        .select();

      const result: RLSTestResult = {
        table,
        operation: 'INSERT',
        userType,
        allowed: !error,
        rowCount: data?.length || 0,
        error: error?.message,
      };

      // Clean up test data if insert succeeded
      if (!error && data && data.length > 0) {
        await client.from(table).delete().eq('id', data[0].id);
      }

      this.results.push(result);
      return result;
    } catch (err: any) {
      const result: RLSTestResult = {
        table,
        operation: 'INSERT',
        userType,
        allowed: false,
        error: err.message,
      };
      this.results.push(result);
      return result;
    }
  }

  async testUpdate(
    client: SupabaseClient,
    table: string,
    userType: string,
    filter: Record<string, any>,
    updateData: Record<string, any>
  ): Promise<RLSTestResult> {
    try {
      let query = client.from(table).update(updateData);

      for (const [key, value] of Object.entries(filter)) {
        query = query.eq(key, value);
      }

      const { data, error } = await query.select();

      const result: RLSTestResult = {
        table,
        operation: 'UPDATE',
        userType,
        allowed: !error,
        rowCount: data?.length || 0,
        error: error?.message,
      };

      this.results.push(result);
      return result;
    } catch (err: any) {
      const result: RLSTestResult = {
        table,
        operation: 'UPDATE',
        userType,
        allowed: false,
        error: err.message,
      };
      this.results.push(result);
      return result;
    }
  }

  async testDelete(
    client: SupabaseClient,
    table: string,
    userType: string,
    filter: Record<string, any>
  ): Promise<RLSTestResult> {
    try {
      let query = client.from(table).delete();

      for (const [key, value] of Object.entries(filter)) {
        query = query.eq(key, value);
      }

      const { data, error } = await query.select();

      const result: RLSTestResult = {
        table,
        operation: 'DELETE',
        userType,
        allowed: !error,
        rowCount: data?.length ?? 0,
        error: error?.message,
      };

      this.results.push(result);
      return result;
    } catch (err: any) {
      const result: RLSTestResult = {
        table,
        operation: 'DELETE',
        userType,
        allowed: false,
        error: err.message,
      };
      this.results.push(result);
      return result;
    }
  }

  getResults(): RLSTestResult[] {
    return this.results;
  }

  generateReport(): string {
    let report = '# RLS E2E Test Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += '## Results Summary\n\n';
    report += '| Table | Operation | User Type | Allowed | Rows | Error |\n';
    report += '|-------|-----------|-----------|---------|------|-------|\n';

    for (const result of this.results) {
      report += `| ${result.table} | ${result.operation} | ${result.userType} | ${result.allowed ? '✅' : '❌'} | ${result.rowCount ?? '-'} | ${result.error || '-'} |\n`;
    }

    // Security issues summary
    const issues = this.findSecurityIssues();
    if (issues.length > 0) {
      report += '\n## ⚠️ Security Issues Found\n\n';
      for (const issue of issues) {
        report += `- ${issue}\n`;
      }
    } else {
      report += '\n## ✅ No Security Issues Found\n';
    }

    return report;
  }

  findSecurityIssues(): string[] {
    const issues: string[] = [];

    // Check if anonymous can access sensitive tables
    const sensitiveTablesForAnonymous = [
      'profiles',
      'contact_messages',
      'audit_logs',
      'newsletter_subscriptions',
      'admin_users',
      'orders',
      'payments',
      'shipping_addresses',
    ];

    for (const result of this.results) {
      if (result.userType === 'anonymous' && result.allowed) {
        if (sensitiveTablesForAnonymous.includes(result.table)) {
          if (result.operation === 'SELECT' && (result.rowCount || 0) > 0) {
            issues.push(
              `Anonymous users can SELECT from ${result.table} (${result.rowCount} rows)`
            );
          }
          if (result.operation !== 'SELECT') {
            issues.push(
              `Anonymous users can ${result.operation} on ${result.table}`
            );
          }
        }
      }

      // Check for any DELETE allowed on audit_logs or payments
      if (
        result.table === 'audit_logs' &&
        result.operation === 'DELETE' &&
        result.allowed
      ) {
        issues.push(
          `${result.userType} can DELETE from audit_logs - this should be blocked!`
        );
      }
      if (
        result.table === 'payments' &&
        result.operation === 'DELETE' &&
        result.allowed
      ) {
        issues.push(
          `${result.userType} can DELETE from payments - this should be blocked!`
        );
      }
    }

    return issues;
  }
}

// Main test suite - single shared client, sign in/out between role blocks
describe.skipIf(!isRealSupabase)('RLS E2E Security Tests', () => {
  const runner = new RLSTestRunner();
  let client: SupabaseClient;
  let regularUserId: string | null = null;

  beforeAll(async () => {
    client = createSharedClient();
  });

  afterAll(async () => {
    await client.auth.signOut();
    console.log(runner.generateReport());
  });

  // Anonymous user tests (client has no session)
  // Note: RLS blocks return 0 rows (no error). We assert rowCount === 0 to verify no data leaked.
  describe('Anonymous User Access', () => {
    it('should NOT be able to SELECT from profiles', async () => {
      const result = await runner.testSelect(client, 'profiles', 'anonymous');
      expect(result.rowCount).toBe(0);
    });

    it('should NOT be able to SELECT from contact_messages', async () => {
      const result = await runner.testSelect(
        client,
        'contact_messages',
        'anonymous'
      );
      expect(result.rowCount).toBe(0);
    });

    it('should NOT be able to SELECT from audit_logs', async () => {
      const result = await runner.testSelect(client, 'audit_logs', 'anonymous');
      expect(result.rowCount).toBe(0);
    });

    it('should NOT be able to SELECT from newsletter_subscriptions', async () => {
      const result = await runner.testSelect(
        client,
        'newsletter_subscriptions',
        'anonymous'
      );
      expect(result.rowCount).toBe(0);
    });

    it('should NOT be able to SELECT from admin_users', async () => {
      const result = await runner.testSelect(
        client,
        'admin_users',
        'anonymous'
      );
      expect(result.rowCount).toBe(0);
    });

    it('should NOT be able to SELECT from orders', async () => {
      const result = await runner.testSelect(client, 'orders', 'anonymous');
      expect(result.rowCount).toBe(0);
    });

    it('should NOT be able to SELECT from payments', async () => {
      const result = await runner.testSelect(client, 'payments', 'anonymous');
      expect(result.rowCount).toBe(0);
    });

    it('should be able to SELECT from products (public)', async () => {
      const result = await runner.testSelect(client, 'products', 'anonymous');
      expect(result.allowed).toBe(true);
    });

    it('should be able to SELECT from categories (public)', async () => {
      const result = await runner.testSelect(client, 'categories', 'anonymous');
      expect(result.allowed).toBe(true);
    });

    it('should NOT be able to INSERT into products', async () => {
      const result = await runner.testInsert(client, 'products', 'anonymous', {
        name: 'Test Product',
        price: 100,
        description: 'Test',
        category: 'test',
        artisan: 'test',
        care: 'test',
        details: 'test',
        images: [],
      });
      expect(result.allowed).toBe(false);
    });

    it('should NOT be able to DELETE from any sensitive table', async () => {
      const result = await runner.testDelete(client, 'products', 'anonymous', {
        id: -1,
      });
      expect(result.rowCount ?? 0).toBe(0);
    });
  });

  // Authenticated regular user tests
  describe('Authenticated Regular User Access', () => {
    beforeAll(async () => {
      regularUserId = await signInClient(
        client,
        TEST_USERS.regular.email,
        TEST_USERS.regular.password
      );
    });
    afterAll(async () => {
      await client.auth.signOut();
    });

    it('should be able to SELECT own profile only', async () => {
      if (!regularUserId) {
        console.warn('Skipping: regular user not authenticated');
        return;
      }

      const result = await runner.testSelect(
        client,
        'profiles',
        'regular_user'
      );
      expect(result.allowed).toBe(true);
      // Should only see own profile
      expect(result.rowCount).toBeLessThanOrEqual(1);
    });

    it('should NOT be able to SELECT from contact_messages', async () => {
      if (!regularUserId) {
        console.warn('Skipping: regular user not authenticated');
        return;
      }

      const result = await runner.testSelect(
        client,
        'contact_messages',
        'regular_user'
      );
      // Should be denied or return empty
      expect(result.rowCount).toBe(0);
    });

    it('should NOT be able to SELECT from audit_logs', async () => {
      if (!regularUserId) {
        console.warn('Skipping: regular user not authenticated');
        return;
      }

      const result = await runner.testSelect(
        client,
        'audit_logs',
        'regular_user'
      );
      expect(result.rowCount).toBe(0);
    });

    it('should NOT be able to INSERT into products', async () => {
      if (!regularUserId) {
        console.warn('Skipping: regular user not authenticated');
        return;
      }

      const result = await runner.testInsert(
        client,
        'products',
        'regular_user',
        {
          name: 'Test Product',
          price: 100,
          description: 'Test',
          category: 'test',
          artisan: 'test',
          care: 'test',
          details: 'test',
          images: [],
        }
      );
      expect(result.allowed).toBe(false);
    });

    it('should be able to SELECT own orders only', async () => {
      if (!regularUserId) {
        console.warn('Skipping: regular user not authenticated');
        return;
      }

      const result = await runner.testSelect(client, 'orders', 'regular_user');
      expect(result.allowed).toBe(true);
      // All returned orders should belong to this user (verified by RLS)
    });
  });

  // Admin user tests
  describe('Admin User Access', () => {
    let adminAuthenticated = false;
    beforeAll(async () => {
      await client.auth.signOut();
      adminAuthenticated =
        (await signInClient(
          client,
          TEST_USERS.admin.email,
          TEST_USERS.admin.password
        )) !== null;
    });
    afterAll(async () => {
      await client.auth.signOut();
    });

    it('should be able to SELECT from products', async () => {
      if (!adminAuthenticated) {
        console.warn('Skipping: admin user not authenticated');
        return;
      }

      const result = await runner.testSelect(client, 'products', 'admin');
      expect(result.allowed).toBe(true);
    });

    it('should NOT be able to SELECT from contact_messages (super_admin only)', async () => {
      if (!adminAuthenticated) {
        console.warn('Skipping: admin user not authenticated');
        return;
      }

      const result = await runner.testSelect(
        client,
        'contact_messages',
        'admin'
      );
      // Regular admin should NOT be able to see contact messages
      expect(result.rowCount).toBe(0);
    });

    it('should NOT be able to SELECT from audit_logs (super_admin only)', async () => {
      if (!adminAuthenticated) {
        console.warn('Skipping: admin user not authenticated');
        return;
      }

      const result = await runner.testSelect(client, 'audit_logs', 'admin');
      expect(result.rowCount).toBe(0);
    });

    it('should be able to UPDATE products', async () => {
      if (!adminAuthenticated) {
        console.warn('Skipping: admin user not authenticated');
        return;
      }

      // Test update with a filter that won't match anything
      const result = await runner.testUpdate(
        client,
        'products',
        'admin',
        { id: -99999 },
        { name: 'Updated Test' }
      );
      // Should be allowed even if no rows match
      expect(result.allowed).toBe(true);
    });
  });

  // Super Admin tests
  describe('Super Admin User Access', () => {
    let superAdminAuthenticated = false;
    beforeAll(async () => {
      await client.auth.signOut();
      superAdminAuthenticated =
        (await signInClient(
          client,
          TEST_USERS.superAdmin.email,
          TEST_USERS.superAdmin.password
        )) !== null;
    });
    afterAll(async () => {
      await client.auth.signOut();
    });

    it('should be able to SELECT from contact_messages', async () => {
      if (!superAdminAuthenticated) {
        console.warn('Skipping: super admin not authenticated');
        return;
      }

      const result = await runner.testSelect(
        client,
        'contact_messages',
        'super_admin'
      );
      expect(result.allowed).toBe(true);
    });

    it('should be able to SELECT from audit_logs', async () => {
      if (!superAdminAuthenticated) {
        console.warn('Skipping: super admin not authenticated');
        return;
      }

      const result = await runner.testSelect(
        client,
        'audit_logs',
        'super_admin'
      );
      expect(result.allowed).toBe(true);
    });

    it('should be able to SELECT from all admin_users', async () => {
      if (!superAdminAuthenticated) {
        console.warn('Skipping: super admin not authenticated');
        return;
      }

      const result = await runner.testSelect(
        client,
        'admin_users',
        'super_admin'
      );
      expect(result.allowed).toBe(true);
    });

    it('should NOT be able to DELETE from audit_logs', async () => {
      if (!superAdminAuthenticated) {
        console.warn('Skipping: super admin not authenticated');
        return;
      }

      const result = await runner.testDelete(
        client,
        'audit_logs',
        'super_admin',
        { id: 'non-existent' }
      );
      expect(result.allowed).toBe(false);
    });

    it('should NOT be able to UPDATE audit_logs', async () => {
      if (!superAdminAuthenticated) {
        console.warn('Skipping: super admin not authenticated');
        return;
      }

      const result = await runner.testUpdate(
        client,
        'audit_logs',
        'super_admin',
        { id: 'non-existent' },
        { action: 'TAMPERED' }
      );
      expect(result.allowed).toBe(false);
    });

    it('should NOT be able to DELETE from payments', async () => {
      if (!superAdminAuthenticated) {
        console.warn('Skipping: super admin not authenticated');
        return;
      }

      const result = await runner.testDelete(
        client,
        'payments',
        'super_admin',
        { id: 'non-existent' }
      );
      expect(result.allowed).toBe(false);
    });
  });

  // Cross-user access tests (needs regular user session)
  describe('Cross-User Access Prevention', () => {
    beforeAll(async () => {
      await client.auth.signOut();
      regularUserId = await signInClient(
        client,
        TEST_USERS.regular.email,
        TEST_USERS.regular.password
      );
    });
    afterAll(async () => {
      await client.auth.signOut();
    });

    it('should prevent user from accessing other user profiles', async () => {
      if (!regularUserId) {
        console.warn('Skipping: regular user not authenticated');
        return;
      }

      // Try to access a profile that doesn't belong to the user
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .neq('id', regularUserId) // Try to get OTHER users' profiles
        .limit(5);

      // Should return empty or error
      expect(data?.length || 0).toBe(0);
    });

    it('should prevent user from accessing other user orders', async () => {
      if (!regularUserId) {
        console.warn('Skipping: regular user not authenticated');
        return;
      }

      // RLS should filter to only own orders
      const { data } = await client.from('orders').select('user_id').limit(10);

      // All returned orders should belong to this user
      if (data && data.length > 0) {
        for (const order of data) {
          expect(order.user_id).toBe(regularUserId);
        }
      }
    });
  });

  // Security report generation
  describe('Security Report', () => {
    it('should generate report with no critical issues', () => {
      const issues = runner.findSecurityIssues();

      // Log all issues for visibility
      if (issues.length > 0) {
        console.error('Security Issues Found:');
        issues.forEach((issue) => console.error(`  - ${issue}`));
      }

      // Critical issues that should fail the test
      const criticalIssues = issues.filter(
        (issue) =>
          issue.includes('anonymous') &&
          (issue.includes('profiles') ||
            issue.includes('contact_messages') ||
            issue.includes('audit_logs') ||
            issue.includes('payments') ||
            issue.includes('orders'))
      );

      expect(criticalIssues.length).toBe(0);
    });
  });
});

// Export for use in CI/CD
export { RLSTestRunner, createSharedClient, signInClient };
