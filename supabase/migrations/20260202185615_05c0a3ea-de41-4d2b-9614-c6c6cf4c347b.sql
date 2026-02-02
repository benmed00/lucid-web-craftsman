-- Fix the function search path for mark_abandoned_checkout_sessions
CREATE OR REPLACE FUNCTION mark_abandoned_checkout_sessions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.checkout_sessions
  SET 
    status = 'abandoned',
    abandoned_at = now(),
    updated_at = now()
  WHERE 
    status = 'in_progress'
    AND expires_at < now()
    AND order_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;