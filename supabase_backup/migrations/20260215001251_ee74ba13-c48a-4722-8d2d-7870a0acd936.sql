
-- Admin-only function to get user emails from auth.users
CREATE OR REPLACE FUNCTION public.get_user_emails_for_admin(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id AS user_id, au.email::text
  FROM auth.users au
  WHERE au.id = ANY(p_user_ids)
    AND public.is_admin_user(auth.uid())
$$;
