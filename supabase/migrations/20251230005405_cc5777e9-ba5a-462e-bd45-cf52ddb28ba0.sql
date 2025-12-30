-- Email A/B Tests table
CREATE TABLE public.email_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, completed
  variant_a_subject TEXT,
  variant_b_subject TEXT,
  variant_a_sent INTEGER NOT NULL DEFAULT 0,
  variant_b_sent INTEGER NOT NULL DEFAULT 0,
  variant_a_opens INTEGER NOT NULL DEFAULT 0,
  variant_b_opens INTEGER NOT NULL DEFAULT 0,
  split_percentage INTEGER NOT NULL DEFAULT 50, -- % going to variant A
  winner TEXT, -- 'a', 'b', or null
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Scheduled Emails table
CREATE TABLE public.scheduled_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, cancelled
  email_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_ab_tests
CREATE POLICY "Admins can manage A/B tests"
  ON public.email_ab_tests
  FOR ALL
  USING (is_admin_user(auth.uid()));

-- RLS Policies for scheduled_emails
CREATE POLICY "Admins can manage scheduled emails"
  ON public.scheduled_emails
  FOR ALL
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System can insert scheduled emails"
  ON public.scheduled_emails
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update scheduled emails"
  ON public.scheduled_emails
  FOR UPDATE
  USING (true);

-- Indexes for performance
CREATE INDEX idx_scheduled_emails_status_scheduled ON public.scheduled_emails(status, scheduled_for) 
  WHERE status = 'pending';
CREATE INDEX idx_email_ab_tests_status ON public.email_ab_tests(status);

-- Update trigger for updated_at
CREATE TRIGGER update_email_ab_tests_updated_at
  BEFORE UPDATE ON public.email_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_emails_updated_at
  BEFORE UPDATE ON public.scheduled_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();