
-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to send security alerts every 5 minutes
SELECT cron.schedule(
  'send-security-alerts-every-5-min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://xcvlijchkmhjonhfildm.supabase.co/functions/v1/security-alert-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdmxpamNoa21oam9uaGZpbGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMjY4MDQsImV4cCI6MjA2MjcwMjgwNH0.mAYF8vCzYfT8QT-tPP4p4fW9_11vVHhJ8tBBDFEcg4c"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Insert a test security event to trigger an alert (simulating unauthorized admin access)
INSERT INTO public.security_events (
  event_type,
  severity,
  user_id,
  ip_address,
  user_agent,
  event_data
) VALUES (
  'UNAUTHORIZED_ADMIN_LIST_ACCESS',
  'critical',
  NULL,
  '192.168.1.100'::inet,
  'Mozilla/5.0 (Test Browser) Security Test',
  jsonb_build_object(
    'test', true,
    'reason', 'Simulated unauthorized admin access attempt for testing',
    'timestamp', now()
  )
);
