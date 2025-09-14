-- Fix security vulnerability in contact_messages table
-- Add explicit policy to deny unauthorized SELECT access to contact messages

-- Drop existing policies to recreate them more securely
DROP POLICY IF EXISTS "Admins can manage all contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Anyone can create contact messages" ON public.contact_messages;

-- Create secure policies for contact messages
-- 1. Only admins can view contact messages
CREATE POLICY "Only admins can view contact messages" 
ON public.contact_messages 
FOR SELECT 
USING (is_admin_user(auth.uid()));

-- 2. Only admins can update contact messages  
CREATE POLICY "Only admins can update contact messages" 
ON public.contact_messages 
FOR UPDATE 
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

-- 3. Only admins can delete contact messages
CREATE POLICY "Only admins can delete contact messages" 
ON public.contact_messages 
FOR DELETE 
USING (is_admin_user(auth.uid()));

-- 4. Anyone can submit contact messages (but not read them)
CREATE POLICY "Anyone can submit contact messages" 
ON public.contact_messages 
FOR INSERT 
WITH CHECK (true);

-- Create a security function to log contact message access when called explicitly
CREATE OR REPLACE FUNCTION public.log_contact_message_access(message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  contact_email text;
BEGIN
  -- Get the email from the contact message (only admins can call this)
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  SELECT email INTO contact_email 
  FROM public.contact_messages 
  WHERE id = message_id;
  
  -- Log the access
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'CONTACT_MESSAGE_ACCESS',
    'contact_message',
    message_id::text,
    jsonb_build_object('email_accessed', public.mask_email(contact_email)),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$function$;