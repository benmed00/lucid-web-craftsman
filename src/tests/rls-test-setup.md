# RLS E2E Test Setup Guide

## Overview

This guide explains how to set up and run the RLS (Row Level Security) E2E tests for the Rif Straw application.

## Prerequisites

1. Access to Supabase project
2. Node.js and npm/bun installed
3. Test user accounts created in Supabase Auth

## Step 1: Create Test Users

Create the following test users in your Supabase Auth dashboard or via SQL:

### Regular User
```sql
-- This should be done via Supabase Auth dashboard or signUp API
-- Email: test-user@example.com
-- Password: test-password-123
```

### Admin User
```sql
-- 1. Create user in Supabase Auth
-- Email: test-admin@example.com
-- Password: test-admin-password-123

-- 2. Add to user_roles table
INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES (
  '<admin-user-uuid>',
  'admin',
  '<your-super-admin-uuid>'
);

-- 3. Add to admin_users table
INSERT INTO public.admin_users (user_id, email, name, role)
VALUES (
  '<admin-user-uuid>',
  'test-admin@example.com',
  'Test Admin',
  'admin'
);
```

### Super Admin User
```sql
-- 1. Create user in Supabase Auth
-- Email: test-superadmin@example.com
-- Password: test-superadmin-password-123

-- 2. Add to user_roles table
INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES (
  '<super-admin-user-uuid>',
  'super_admin',
  '<super-admin-user-uuid>'
);

-- 3. Add to admin_users table
INSERT INTO public.admin_users (user_id, email, name, role)
VALUES (
  '<super-admin-user-uuid>',
  'test-superadmin@example.com',
  'Test Super Admin',
  'super-admin'
);
```

## Step 2: Set Environment Variables

Create a `.env.test` file or set these environment variables:

```bash
# Test User Credentials
TEST_USER_EMAIL=test-user@example.com
TEST_USER_PASSWORD=test-password-123

# Test Admin Credentials
TEST_ADMIN_EMAIL=test-admin@example.com
TEST_ADMIN_PASSWORD=test-admin-password-123

# Test Super Admin Credentials
TEST_SUPER_ADMIN_EMAIL=test-superadmin@example.com
TEST_SUPER_ADMIN_PASSWORD=test-superadmin-password-123
```

## Step 3: Run Tests

```bash
# Run all RLS tests
npx vitest src/tests/rls-e2e.test.ts

# Run with verbose output
npx vitest src/tests/rls-e2e.test.ts --reporter=verbose

# Run specific test suite
npx vitest src/tests/rls-e2e.test.ts -t "Anonymous User Access"
```

## Step 4: Interpret Results

The test suite will output a report like:

```
# RLS E2E Test Report

| Table | Operation | User Type | Allowed | Rows | Error |
|-------|-----------|-----------|---------|------|-------|
| profiles | SELECT | anonymous | ❌ | - | permission denied |
| profiles | SELECT | regular_user | ✅ | 1 | - |
| contact_messages | SELECT | super_admin | ✅ | 5 | - |
...

## ✅ No Security Issues Found
```

### Security Issue Indicators

- ⚠️ Anonymous access to sensitive tables
- ⚠️ Cross-user data access
- ⚠️ Audit log tampering allowed
- ⚠️ Payment deletion allowed

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run RLS Security Tests
  env:
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
    TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
    TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
    TEST_SUPER_ADMIN_EMAIL: ${{ secrets.TEST_SUPER_ADMIN_EMAIL }}
    TEST_SUPER_ADMIN_PASSWORD: ${{ secrets.TEST_SUPER_ADMIN_PASSWORD }}
  run: npx vitest src/tests/rls-e2e.test.ts --run
```

## Troubleshooting

### "User not authenticated" warnings
- Verify test user exists in Supabase Auth
- Check email/password are correct
- Ensure user is not banned/blocked

### "permission denied" errors (expected for most tests)
- This is the expected behavior for denied access
- RLS is working correctly

### Tests timing out
- Check network connectivity to Supabase
- Increase test timeout in vitest config

## Security Best Practices

1. **Never commit test credentials** to version control
2. **Use separate test database** if possible
3. **Rotate test passwords** regularly
4. **Monitor test user activity** in audit logs
5. **Delete test users** after testing in production
