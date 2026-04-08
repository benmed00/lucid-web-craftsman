
-- 1. Secure masked views with security_invoker
ALTER VIEW public.profiles_masked SET (security_invoker = true);
ALTER VIEW public.contact_messages_masked SET (security_invoker = true);
ALTER VIEW public.email_logs_masked SET (security_invoker = true);

-- Revoke anon access to masked views
REVOKE ALL ON public.profiles_masked FROM anon;
REVOKE ALL ON public.contact_messages_masked FROM anon;
REVOKE ALL ON public.email_logs_masked FROM anon;

-- 2. Fix error-screenshots SELECT policy: restrict to admins
DROP POLICY IF EXISTS "Authenticated users can view error screenshots" ON storage.objects;
DROP POLICY IF EXISTS "error_screenshots_select" ON storage.objects;

CREATE POLICY "error_screenshots_select_admin_only"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'error-screenshots'
  AND is_admin_user((SELECT auth.uid()))
);

-- 3. Fix blog-images write policies: restrict to admins
DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete blog images" ON storage.objects;
DROP POLICY IF EXISTS "blog_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "blog_images_update" ON storage.objects;
DROP POLICY IF EXISTS "blog_images_delete" ON storage.objects;

CREATE POLICY "blog_images_insert_admin_only"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-images'
  AND is_admin_user((SELECT auth.uid()))
);

CREATE POLICY "blog_images_update_admin_only"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog-images'
  AND is_admin_user((SELECT auth.uid()))
);

CREATE POLICY "blog_images_delete_admin_only"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-images'
  AND is_admin_user((SELECT auth.uid()))
);
