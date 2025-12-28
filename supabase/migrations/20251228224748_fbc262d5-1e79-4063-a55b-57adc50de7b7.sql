-- Create storage bucket for error report screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('error-screenshots', 'error-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload screenshots
CREATE POLICY "Users can upload error screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'error-screenshots' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to view their own screenshots
CREATE POLICY "Users can view error screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'error-screenshots'
  AND auth.role() = 'authenticated'
);

-- Allow anonymous uploads for non-logged-in users reporting errors
CREATE POLICY "Anonymous users can upload error screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'error-screenshots'
  AND auth.role() = 'anon'
);