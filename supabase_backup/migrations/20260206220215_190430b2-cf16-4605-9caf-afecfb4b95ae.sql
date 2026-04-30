
-- ============================================================
-- FIX 1: Checkout sessions guest RLS - validate guest_id from header
-- ============================================================

-- Create a helper function to get guest_id from request header
CREATE OR REPLACE FUNCTION public.get_request_guest_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    current_setting('request.headers', true)::json->>'x-guest-id',
    ''
  );
$$;

-- Drop existing overly permissive guest policies
DROP POLICY IF EXISTS "checkout_sessions_guest_select" ON public.checkout_sessions;
DROP POLICY IF EXISTS "checkout_sessions_guest_update" ON public.checkout_sessions;
DROP POLICY IF EXISTS "checkout_sessions_guest_insert" ON public.checkout_sessions;

-- Recreate with proper guest_id validation
CREATE POLICY "checkout_sessions_guest_select" ON public.checkout_sessions
  FOR SELECT
  USING (
    guest_id IS NOT NULL 
    AND guest_id = public.get_request_guest_id()
  );

CREATE POLICY "checkout_sessions_guest_update" ON public.checkout_sessions
  FOR UPDATE
  USING (
    guest_id IS NOT NULL 
    AND guest_id = public.get_request_guest_id()
  )
  WITH CHECK (
    guest_id IS NOT NULL 
    AND guest_id = public.get_request_guest_id()
  );

CREATE POLICY "checkout_sessions_guest_insert" ON public.checkout_sessions
  FOR INSERT
  WITH CHECK (
    guest_id IS NOT NULL 
    AND guest_id = public.get_request_guest_id()
  );

-- ============================================================
-- FIX 2: profiles_masked view - add RLS protection
-- Already converted to SECURITY INVOKER in previous migration,
-- so it respects the querying user's RLS. But we need to ensure
-- the underlying profiles table RLS covers it.
-- The view uses SECURITY INVOKER so RLS from profiles table applies.
-- No additional action needed if profiles has proper RLS.
-- ============================================================

-- ============================================================
-- FIX 3: Server-side HTML sanitization trigger for products
-- ============================================================

CREATE OR REPLACE FUNCTION public.sanitize_product_html()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Strip script tags and event handlers from details
  IF NEW.details IS NOT NULL THEN
    NEW.details = regexp_replace(NEW.details, '<script[^>]*>.*?</script>', '', 'gi');
    NEW.details = regexp_replace(NEW.details, '\s+on\w+\s*=\s*"[^"]*"', '', 'gi');
    NEW.details = regexp_replace(NEW.details, '\s+on\w+\s*=\s*''[^'']*''', '', 'gi');
    NEW.details = regexp_replace(NEW.details, '<iframe[^>]*>.*?</iframe>', '', 'gi');
    NEW.details = regexp_replace(NEW.details, '<object[^>]*>.*?</object>', '', 'gi');
    NEW.details = regexp_replace(NEW.details, '<embed[^>]*>', '', 'gi');
    NEW.details = regexp_replace(NEW.details, '<form[^>]*>.*?</form>', '', 'gi');
  END IF;
  
  -- Strip script tags and event handlers from care instructions
  IF NEW.care IS NOT NULL THEN
    NEW.care = regexp_replace(NEW.care, '<script[^>]*>.*?</script>', '', 'gi');
    NEW.care = regexp_replace(NEW.care, '\s+on\w+\s*=\s*"[^"]*"', '', 'gi');
    NEW.care = regexp_replace(NEW.care, '\s+on\w+\s*=\s*''[^'']*''', '', 'gi');
    NEW.care = regexp_replace(NEW.care, '<iframe[^>]*>.*?</iframe>', '', 'gi');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger on insert and update
DROP TRIGGER IF EXISTS sanitize_product_html_trigger ON public.products;
CREATE TRIGGER sanitize_product_html_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_product_html();
