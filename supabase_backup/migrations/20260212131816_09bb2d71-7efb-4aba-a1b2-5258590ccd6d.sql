-- Fix 1: Add size and MIME type restrictions to error-screenshots bucket
UPDATE storage.buckets
SET 
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
WHERE id = 'error-screenshots';
