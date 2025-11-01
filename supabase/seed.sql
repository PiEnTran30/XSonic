-- Seed default plans
INSERT INTO public.plans (name, slug, description, price_monthly, price_yearly, credits_monthly, features, limits, is_active, is_visible, sort_order) VALUES
(
  'Free',
  'free',
  'Perfect for trying out X-Sonic',
  0,
  0,
  100,
  '{"ai_audio": false, "audio_basic": true, "video_tools": false, "priority_queue": false, "gpu_access": false, "api_access": false}'::jsonb,
  '{"max_file_size_mb": 50, "max_duration_minutes": 10, "max_concurrent_jobs": 1, "max_storage_gb": 1, "cpu_minutes_monthly": 30, "gpu_minutes_monthly": 0, "max_jobs_per_day": 10}'::jsonb,
  true,
  true,
  1
),
(
  'Starter',
  'starter',
  'For hobbyists and content creators',
  9.99,
  99.99,
  1000,
  '{"ai_audio": true, "audio_basic": true, "video_tools": true, "priority_queue": false, "gpu_access": false, "api_access": false}'::jsonb,
  '{"max_file_size_mb": 200, "max_duration_minutes": 30, "max_concurrent_jobs": 3, "max_storage_gb": 10, "cpu_minutes_monthly": 300, "gpu_minutes_monthly": 10, "max_jobs_per_day": 50}'::jsonb,
  true,
  true,
  2
),
(
  'Pro',
  'pro',
  'For professionals and small teams',
  29.99,
  299.99,
  5000,
  '{"ai_audio": true, "audio_basic": true, "video_tools": true, "priority_queue": true, "gpu_access": true, "api_access": true}'::jsonb,
  '{"max_file_size_mb": 500, "max_duration_minutes": 120, "max_concurrent_jobs": 10, "max_storage_gb": 50, "cpu_minutes_monthly": 1000, "gpu_minutes_monthly": 100, "max_jobs_per_day": 200}'::jsonb,
  true,
  true,
  3
),
(
  'Enterprise',
  'enterprise',
  'For large teams and businesses',
  99.99,
  999.99,
  20000,
  '{"ai_audio": true, "audio_basic": true, "video_tools": true, "priority_queue": true, "gpu_access": true, "api_access": true, "custom_features": ["dedicated_support", "custom_integrations"]}'::jsonb,
  '{"max_file_size_mb": 2000, "max_duration_minutes": 480, "max_concurrent_jobs": 50, "max_storage_gb": 500, "cpu_minutes_monthly": 10000, "gpu_minutes_monthly": 1000, "max_jobs_per_day": 1000}'::jsonb,
  true,
  true,
  4
);

-- Seed default feature flags
INSERT INTO public.feature_flags (key, value, description, is_active) VALUES
('gpu_enabled', 'false'::jsonb, 'Enable GPU workers', true),
('allow_cpu_fallback', 'true'::jsonb, 'Allow CPU fallback when GPU unavailable', true),
('gpu_autostart_cooldown_min', '5'::jsonb, 'GPU autostart cooldown in minutes', true),
('gpu_autostop_idle_min', '10'::jsonb, 'GPU autostop idle time in minutes', true),
('hard_limit_enabled', 'true'::jsonb, 'Enable hard credit limits', true),
('storage_ttl_days', '7'::jsonb, 'Storage TTL in days', true),
('max_upload_size_mb', '2000'::jsonb, 'Maximum upload size in MB', true),
('maintenance_mode', 'false'::jsonb, 'Enable maintenance mode', true),
('asr_provider', '"openai"'::jsonb, 'ASR provider (openai, whisper)', true),
('tts_provider', '"elevenlabs"'::jsonb, 'TTS provider (elevenlabs, google)', true),
('stem_split_enabled', 'true'::jsonb, 'Enable stem splitter tool', true),
('audio_enhance_enabled', 'true'::jsonb, 'Enable audio enhance tool', true),
('video_download_enabled', 'true'::jsonb, 'Enable video downloader tool', true);

-- Seed sample voucher
INSERT INTO public.vouchers (code, type, value, max_uses, valid_from, valid_until, is_active) VALUES
('WELCOME100', 'credits', 100, 1000, NOW(), NOW() + INTERVAL '30 days', true),
('BETA500', 'credits', 500, 100, NOW(), NOW() + INTERVAL '90 days', true);

