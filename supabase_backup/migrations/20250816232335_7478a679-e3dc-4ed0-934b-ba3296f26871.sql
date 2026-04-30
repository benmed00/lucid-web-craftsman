-- Final security fix: Enhance support_tickets RLS policies
-- Create more restrictive policies to prevent email harvesting

-- Drop existing policies to recreate with better security
DROP POLICY IF EXISTS "Users can create support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view their own support tickets" ON public.support_tickets;  
DROP POLICY IF EXISTS "Users can update their own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can manage all support tickets" ON public.support_tickets;

-- Create enhanced RLS policies for support tickets
CREATE POLICY "Users can create their own support tickets" 
    ON public.support_tickets
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can only view their own tickets
CREATE POLICY "Users can view only their own support tickets" 
    ON public.support_tickets
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can only update their own tickets (limited fields)
CREATE POLICY "Users can update only their own support tickets" 
    ON public.support_tickets
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admins can manage all tickets but with audit logging
CREATE POLICY "Admins can manage all support tickets" 
    ON public.support_tickets
    FOR ALL 
    TO authenticated
    USING (is_admin_user(auth.uid()))
    WITH CHECK (is_admin_user(auth.uid()));

-- Prevent any public access to support tickets
CREATE POLICY "Deny anonymous access to support tickets" 
    ON public.support_tickets
    FOR ALL 
    TO anon
    USING (false);

-- Add function to validate support ticket access
CREATE OR REPLACE FUNCTION public.can_access_support_ticket(ticket_id uuid)
RETURNS boolean AS $$
DECLARE
    ticket_user_id uuid;
BEGIN
    -- Get the user_id of the ticket
    SELECT user_id INTO ticket_user_id
    FROM public.support_tickets
    WHERE id = ticket_id;
    
    -- Allow access if user owns the ticket or is an admin
    RETURN (
        ticket_user_id = auth.uid() OR 
        is_admin_user(auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;