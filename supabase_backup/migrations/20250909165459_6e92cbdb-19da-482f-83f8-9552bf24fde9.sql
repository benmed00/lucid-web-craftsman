-- Check and fix remaining functions that may need search_path set

-- Get list of all functions to identify which ones need search_path fixed
DO $$
DECLARE
    func_record RECORD;
    func_def TEXT;
BEGIN
    -- Check common functions that might not have search_path set
    FOR func_record IN 
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
          AND routine_type = 'FUNCTION'
          AND routine_name NOT LIKE 'pg_%'
    LOOP
        -- Get function definition
        SELECT pg_get_functiondef(p.oid) INTO func_def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
          AND p.proname = func_record.routine_name;
        
        -- Log functions that don't have SET search_path
        IF func_def IS NOT NULL AND func_def NOT LIKE '%SET search_path%' THEN
            RAISE NOTICE 'Function % may need search_path set', func_record.routine_name;
        END IF;
    END LOOP;
END $$;

-- Fix any remaining functions that commonly need search_path
-- Update functions that are commonly flagged by the linter

-- Check if update_updated_at_column needs fixing
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if update_error_report_updated_at needs fixing  
CREATE OR REPLACE FUNCTION public.update_error_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure handle_new_user function has search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;

  -- Initialize loyalty account with welcome bonus
  PERFORM public.init_loyalty_account(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add security event for function security compliance
INSERT INTO public.security_events (
  event_type, 
  severity, 
  event_data
) VALUES (
  'FUNCTION_SECURITY_HARDENING',
  'low',
  jsonb_build_object(
    'action', 'search_path_standardization',
    'timestamp', now(),
    'description', 'Applied search_path security to database functions'
  )
);