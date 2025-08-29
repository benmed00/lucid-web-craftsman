-- Fix critical security vulnerability in support_tickets_error_reports table
-- Remove public read access that exposes customer email addresses

-- Drop the insecure policy that allows anonymous users to read all error reports
DROP POLICY IF EXISTS "Users can view their own error reports" ON public.support_tickets_error_reports;

-- Create a secure policy that only allows authenticated users to view their own reports
CREATE POLICY "Authenticated users can view only their own error reports"
ON public.support_tickets_error_reports
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Create a separate policy for anonymous users to view only their own reports using email matching
-- This allows anonymous bug reporters to check their report status if they know their email
CREATE POLICY "Anonymous users can view their own error reports by email"
ON public.support_tickets_error_reports  
FOR SELECT
USING (
  auth.uid() IS NULL 
  AND auth.role() = 'anon'
  AND email = current_setting('request.jwt.claims', true)::json->>'email'
);

-- Add a function to safely retrieve error reports with masked emails for non-owners
CREATE OR REPLACE FUNCTION public.get_masked_error_report(report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    report_record jsonb;
    user_owns_report boolean;
    is_admin_user boolean;
BEGIN
    -- Check if user owns this error report
    SELECT EXISTS (
        SELECT 1 FROM public.support_tickets_error_reports
        WHERE id = report_id AND user_id = auth.uid()
    ) INTO user_owns_report;
    
    -- Check if user is admin
    SELECT public.is_admin_user(auth.uid()) INTO is_admin_user;
    
    -- Only allow access if user owns report or is admin
    IF NOT (user_owns_report OR is_admin_user) THEN
        RAISE EXCEPTION 'Access denied to error report';
    END IF;
    
    -- Get error report record
    SELECT to_jsonb(r.*) INTO report_record
    FROM public.support_tickets_error_reports r
    WHERE r.id = report_id;
    
    -- For non-admin users, mask the email address
    IF user_owns_report AND NOT is_admin_user THEN
        report_record := jsonb_set(
            report_record, 
            '{email}', 
            to_jsonb(COALESCE(
                report_record->>'masked_email',
                public.mask_email(report_record->>'email')
            ))
        );
    END IF;
    
    RETURN report_record;
END;
$$;