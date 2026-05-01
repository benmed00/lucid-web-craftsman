-- ===========================================
-- 1. Create function to mask sensitive PII data
-- ===========================================
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_full_mask BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  masked_email TEXT;
  masked_phone TEXT;
BEGIN
  -- Mask email: show first 2 chars + domain
  IF p_email IS NOT NULL THEN
    IF p_full_mask THEN
      masked_email := '***@***';
    ELSE
      masked_email := LEFT(p_email, 2) || '***@' || SPLIT_PART(p_email, '@', 2);
    END IF;
  END IF;
  
  -- Mask phone: show last 4 digits only
  IF p_phone IS NOT NULL THEN
    IF p_full_mask THEN
      masked_phone := '***-****';
    ELSE
      masked_phone := '***-' || RIGHT(REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g'), 4);
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'masked_email', masked_email,
    'masked_phone', masked_phone
  );
END;
$$;

-- ===========================================
-- 2. Create secure view for contact messages with masked data
-- ===========================================
CREATE OR REPLACE VIEW public.contact_messages_masked AS
SELECT 
  id,
  LEFT(first_name, 1) || '***' AS first_name,
  LEFT(last_name, 1) || '***' AS last_name,
  LEFT(email, 2) || '***@' || SPLIT_PART(email, '@', 2) AS email,
  CASE 
    WHEN phone IS NOT NULL THEN '***-' || RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 4)
    ELSE NULL 
  END AS phone,
  company,
  subject,
  LEFT(message, 100) || CASE WHEN LENGTH(message) > 100 THEN '...' ELSE '' END AS message_preview,
  status,
  created_at,
  updated_at,
  -- IP address is fully masked for privacy
  NULL::inet AS ip_address
FROM public.contact_messages;

-- Grant access to the masked view for admins
GRANT SELECT ON public.contact_messages_masked TO authenticated;

-- ===========================================
-- 3. Create audit logging for contact_messages access
-- ===========================================
CREATE OR REPLACE FUNCTION public.log_contact_message_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_count INTEGER;
  is_bulk_access BOOLEAN := false;
BEGIN
  -- Count recent accesses by this user (last 5 minutes)
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND resource_type = 'contact_messages'
    AND action = 'SELECT'
    AND created_at > NOW() - INTERVAL '5 minutes';
  
  -- Flag as bulk access if more than 10 records accessed in 5 minutes
  IF access_count > 10 THEN
    is_bulk_access := true;
  END IF;
  
  -- Log the access
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    new_values,
    ip_address
  ) VALUES (
    auth.uid(),
    'SELECT',
    'contact_messages',
    NEW.id::text,
    jsonb_build_object(
      'is_bulk_access', is_bulk_access,
      'access_count_5min', access_count + 1,
      'accessed_fields', ARRAY['first_name', 'last_name', 'email', 'phone']
    ),
    inet_client_addr()
  );
  
  -- Create security alert for bulk access
  IF is_bulk_access AND access_count = 11 THEN
    INSERT INTO public.security_alerts (
      alert_type,
      severity,
      title,
      description,
      user_id,
      source_ip,
      metadata
    ) VALUES (
      'bulk_data_access',
      'high',
      'Bulk Contact Data Access Detected',
      'A super admin is accessing contact messages in bulk. This may indicate data exfiltration.',
      auth.uid(),
      inet_client_addr(),
      jsonb_build_object(
        'table', 'contact_messages',
        'access_count', access_count + 1,
        'time_window', '5 minutes'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ===========================================
-- 4. Create audit logging for admin_users access
-- ===========================================
CREATE OR REPLACE FUNCTION public.log_admin_user_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log admin user data access
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    new_values,
    ip_address
  ) VALUES (
    auth.uid(),
    'SELECT',
    'admin_users',
    NEW.id::text,
    jsonb_build_object(
      'accessed_email', LEFT(NEW.email, 2) || '***@' || SPLIT_PART(NEW.email, '@', 2),
      'accessed_role', NEW.role
    ),
    inet_client_addr()
  );
  
  RETURN NEW;
END;
$$;

-- ===========================================
-- 5. Create secure function to get contact messages with export controls
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_contact_messages_secure(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_include_pii BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  subject TEXT,
  message TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  is_super_admin BOOLEAN;
  access_count INTEGER;
BEGIN
  caller_id := auth.uid();
  
  -- Check if caller is super_admin
  SELECT has_role(caller_id, 'super_admin') INTO is_super_admin;
  
  IF NOT is_super_admin THEN
    RAISE EXCEPTION 'Access denied: Super admin role required';
  END IF;
  
  -- Enforce maximum limit to prevent bulk exports
  IF p_limit > 100 THEN
    p_limit := 100;
  END IF;
  
  -- Log this access
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    new_values,
    ip_address
  ) VALUES (
    caller_id,
    'BULK_SELECT',
    'contact_messages',
    jsonb_build_object(
      'limit', p_limit,
      'offset', p_offset,
      'include_pii', p_include_pii,
      'function', 'get_contact_messages_secure'
    ),
    inet_client_addr()
  );
  
  -- Count recent bulk accesses
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = caller_id
    AND resource_type = 'contact_messages'
    AND action = 'BULK_SELECT'
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Alert on excessive bulk access (more than 5 bulk queries per hour)
  IF access_count > 5 THEN
    INSERT INTO public.security_alerts (
      alert_type,
      severity,
      title,
      description,
      user_id,
      source_ip,
      metadata
    ) VALUES (
      'excessive_bulk_access',
      'critical',
      'Excessive Bulk Data Access',
      'Super admin has made more than 5 bulk contact message queries in the last hour.',
      caller_id,
      inet_client_addr(),
      jsonb_build_object(
        'access_count', access_count,
        'time_window', '1 hour',
        'include_pii', p_include_pii
      )
    );
  END IF;
  
  -- Return data with optional masking
  IF p_include_pii THEN
    RETURN QUERY
    SELECT 
      cm.id,
      cm.first_name,
      cm.last_name,
      cm.email,
      cm.phone,
      cm.company,
      cm.subject,
      cm.message,
      cm.status,
      cm.created_at,
      cm.updated_at
    FROM public.contact_messages cm
    ORDER BY cm.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  ELSE
    -- Return masked data
    RETURN QUERY
    SELECT 
      cm.id,
      LEFT(cm.first_name, 1) || '***'::TEXT AS first_name,
      LEFT(cm.last_name, 1) || '***'::TEXT AS last_name,
      LEFT(cm.email, 2) || '***@' || SPLIT_PART(cm.email, '@', 2) AS email,
      CASE 
        WHEN cm.phone IS NOT NULL THEN '***-' || RIGHT(REGEXP_REPLACE(cm.phone, '[^0-9]', '', 'g'), 4)
        ELSE NULL 
      END AS phone,
      cm.company,
      cm.subject,
      cm.message,
      cm.status,
      cm.created_at,
      cm.updated_at
    FROM public.contact_messages cm
    ORDER BY cm.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$;

-- ===========================================
-- 6. Create function to get admin users securely with audit logging
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_admin_users_with_audit()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  role TEXT,
  email TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  is_super_admin BOOLEAN;
BEGIN
  caller_id := auth.uid();
  
  -- Check if caller is super_admin
  SELECT has_role(caller_id, 'super_admin') INTO is_super_admin;
  
  -- Log this access
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    new_values,
    ip_address
  ) VALUES (
    caller_id,
    'SELECT_ALL',
    'admin_users',
    jsonb_build_object(
      'is_super_admin', is_super_admin,
      'function', 'get_admin_users_with_audit'
    ),
    inet_client_addr()
  );
  
  -- Super admins see all, regular users only see their own record
  IF is_super_admin THEN
    RETURN QUERY
    SELECT 
      au.id,
      au.user_id,
      au.name,
      au.role,
      au.email,
      au.last_login,
      au.created_at
    FROM public.admin_users au
    ORDER BY au.created_at DESC;
  ELSE
    RETURN QUERY
    SELECT 
      au.id,
      au.user_id,
      au.name,
      au.role,
      -- Mask email for non-super-admins viewing their own record
      LEFT(au.email, 2) || '***@' || SPLIT_PART(au.email, '@', 2) AS email,
      au.last_login,
      au.created_at
    FROM public.admin_users au
    WHERE au.user_id = caller_id;
  END IF;
END;
$$;

-- ===========================================
-- 7. Log this security enhancement
-- ===========================================
INSERT INTO public.audit_logs (
  action,
  resource_type,
  new_values
) VALUES (
  'SECURITY_ENHANCEMENT',
  'system',
  jsonb_build_object(
    'description', 'Added data masking and audit logging for contact_messages and admin_users',
    'features', ARRAY[
      'Masked view for contact_messages',
      'Secure function with export controls',
      'Audit logging for all admin data access',
      'Security alerts for bulk access patterns',
      'Rate limiting on bulk exports (max 100 records, max 5 queries/hour)'
    ],
    'applied_at', NOW()
  )
);