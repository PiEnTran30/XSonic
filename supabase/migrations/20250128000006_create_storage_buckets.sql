-- Create storage buckets using service role
-- Note: This must be run with service_role permissions

-- Create uploads bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  524288000, -- 500MB
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/m4a', 'audio/webm', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create results bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'results',
  'results',
  true,
  524288000, -- 500MB
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/m4a', 'audio/webm', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Public can read uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload results" ON storage.objects;
DROP POLICY IF EXISTS "Public can read results" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own results" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own results" ON storage.objects;

-- Create policies for uploads bucket
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Public can read uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads');

CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policies for results bucket
CREATE POLICY "Authenticated users can upload results"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'results');

CREATE POLICY "Public can read results"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'results');

CREATE POLICY "Users can delete own results"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'results' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own results"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'results' AND auth.uid()::text = (storage.foldername(name))[1]);

