-- Add tool status management
-- This allows admins to enable/disable tools and mark them as "Coming Soon"

-- Update system_settings to include tool status
UPDATE public.system_settings
SET value = '{
  "stem-splitter": {"enabled": false, "coming_soon": true},
  "audio-enhance": {"enabled": false, "coming_soon": true},
  "de-reverb": {"enabled": false, "coming_soon": true},
  "auto-subtitle": {"enabled": false, "coming_soon": true},
  "text-to-speech": {"enabled": false, "coming_soon": true},
  "cut-join": {"enabled": true, "coming_soon": false},
  "pitch-tempo": {"enabled": true, "coming_soon": false},
  "volume-normalize": {"enabled": true, "coming_soon": false},
  "online-recorder": {"enabled": true, "coming_soon": false},
  "video-downloader": {"enabled": true, "coming_soon": false}
}'::jsonb
WHERE key = 'tools_enabled';

-- If the setting doesn't exist, insert it
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'tools_enabled',
  '{
    "stem-splitter": {"enabled": false, "coming_soon": true},
    "audio-enhance": {"enabled": false, "coming_soon": true},
    "de-reverb": {"enabled": false, "coming_soon": true},
    "auto-subtitle": {"enabled": false, "coming_soon": true},
    "text-to-speech": {"enabled": false, "coming_soon": true},
    "cut-join": {"enabled": true, "coming_soon": false},
    "pitch-tempo": {"enabled": true, "coming_soon": false},
    "volume-normalize": {"enabled": true, "coming_soon": false},
    "online-recorder": {"enabled": true, "coming_soon": false},
    "video-downloader": {"enabled": true, "coming_soon": false}
  }'::jsonb,
  'Tool enable/disable and coming soon status'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

