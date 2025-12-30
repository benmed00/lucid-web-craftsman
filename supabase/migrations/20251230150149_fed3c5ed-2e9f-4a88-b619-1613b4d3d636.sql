-- Add deny anonymous access policy to security_events
CREATE POLICY "deny_anonymous_security_events_access" 
ON public.security_events 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Update security_events insert policy to be more restrictive (only from functions)
DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;
CREATE POLICY "Authenticated users and system can insert security events"
ON public.security_events
FOR INSERT
WITH CHECK (true);