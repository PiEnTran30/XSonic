-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Disable RLS for system_settings (admin only access via app layer)
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('maintenance_mode', '{"enabled": false, "message": "Hệ thống đang bảo trì. Vui lòng quay lại sau."}'::jsonb, 'Chế độ bảo trì toàn hệ thống'),
  ('tools_enabled', '{"stem-splitter": true, "audio-enhance": true, "de-reverb": true, "auto-subtitle": true, "text-to-speech": true, "cut-join": true, "pitch-tempo": true, "volume-normalize": true, "online-recorder": true, "video-downloader": true}'::jsonb, 'Bật/tắt từng tool'),
  ('registration_enabled', '{"enabled": true}'::jsonb, 'Cho phép đăng ký user mới'),
  ('max_file_size_mb', '{"free": 50, "starter": 200, "pro": 500, "enterprise": 2000}'::jsonb, 'Giới hạn kích thước file theo plan'),
  ('rate_limits', '{"jobs_per_hour": 10, "jobs_per_day": 100}'::jsonb, 'Giới hạn số jobs')
ON CONFLICT (key) DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_system_settings_timestamp ON public.system_settings;
CREATE TRIGGER trigger_update_system_settings_timestamp
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_timestamp();

