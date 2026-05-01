-- Create support tickets table for error reporting if not exists
CREATE TABLE IF NOT EXISTS public.support_tickets_error_reports (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    email text NOT NULL,
    error_type text NOT NULL DEFAULT 'bug_report',
    page_url text,
    user_agent text,
    description text NOT NULL,
    screenshot_url text,
    priority text DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    browser_info jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets_error_reports ENABLE ROW LEVEL SECURITY;

-- Policies for error reports
CREATE POLICY "Users can create error reports" 
ON public.support_tickets_error_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own error reports" 
ON public.support_tickets_error_reports 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Admins can manage all error reports" 
ON public.support_tickets_error_reports 
FOR ALL 
USING (is_admin_user(auth.uid()));

-- Create contact messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    company text,
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'resolved')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Policies for contact messages
CREATE POLICY "Anyone can create contact messages" 
ON public.contact_messages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage all contact messages" 
ON public.contact_messages 
FOR ALL 
USING (is_admin_user(auth.uid()));