-- Add tags and additional management fields to error reports
ALTER TABLE public.support_tickets_error_reports 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS resolution_notes text,
ADD COLUMN IF NOT EXISTS severity text DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- Create index for better performance on filtering
CREATE INDEX IF NOT EXISTS idx_error_reports_status ON public.support_tickets_error_reports(status);
CREATE INDEX IF NOT EXISTS idx_error_reports_priority ON public.support_tickets_error_reports(priority);
CREATE INDEX IF NOT EXISTS idx_error_reports_error_type ON public.support_tickets_error_reports(error_type);
CREATE INDEX IF NOT EXISTS idx_error_reports_tags ON public.support_tickets_error_reports USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_error_reports_created_at ON public.support_tickets_error_reports(created_at DESC);

-- Update RLS policies for better admin access
DROP POLICY IF EXISTS "Admins can manage all error reports" ON public.support_tickets_error_reports;

CREATE POLICY "Admins can manage all error reports" ON public.support_tickets_error_reports
FOR ALL USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

-- Add trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_error_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_error_reports_updated_at
  BEFORE UPDATE ON public.support_tickets_error_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_error_report_updated_at();