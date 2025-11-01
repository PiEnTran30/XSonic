-- Initialize Google AI & Drive settings in Supabase
-- Run this in Supabase SQL Editor

-- Insert Google integration settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  (
    'google_ai_api_key', 
    '""'::jsonb, 
    'Google AI Studio API Key for Gemini AI features (Auto Subtitle, Audio Enhance, etc.)'
  ),
  (
    'google_drive_credentials', 
    '""'::jsonb, 
    'Google Drive Service Account JSON credentials for file storage'
  ),
  (
    'google_drive_folder_id', 
    '""'::jsonb, 
    'Google Drive folder ID where files will be stored'
  )
ON CONFLICT (key) DO UPDATE
SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- Verify settings were created
SELECT key, description, updated_at
FROM public.system_settings
WHERE key IN ('google_ai_api_key', 'google_drive_credentials', 'google_drive_folder_id')
ORDER BY key;

