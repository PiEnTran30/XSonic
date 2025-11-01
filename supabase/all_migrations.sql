-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plans table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  credits_monthly INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wallets table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  balance_credits NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reserved_credits NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Subscriptions table
CREATE TABLE public.subscriptions_internal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  renews_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  pause_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'refund', 'adjustment')),
  amount NUMERIC(10, 2) NOT NULL,
  balance_after NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  admin_id UUID REFERENCES public.users(id),
  admin_note TEXT,
  receipt_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vouchers table
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('credits', 'discount_percent', 'discount_fixed')),
  value NUMERIC(10, 2) NOT NULL,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Voucher usage table
CREATE TABLE public.voucher_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(voucher_id, user_id)
);

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tool_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pending-gpu', 'queued', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER NOT NULL DEFAULT 0,
  input_file_url TEXT NOT NULL,
  input_metadata JSONB DEFAULT '{}'::jsonb,
  output_files JSONB DEFAULT '[]'::jsonb,
  parameters JSONB DEFAULT '{}'::jsonb,
  requirements JSONB NOT NULL,
  cost_estimate NUMERIC(10, 2) NOT NULL,
  cost_actual NUMERIC(10, 2),
  progress INTEGER NOT NULL DEFAULT 0,
  progress_message TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  idempotency_key TEXT NOT NULL,
  worker_id TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ttl_delete_at TIMESTAMPTZ
);

-- Feature flags table
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage metrics table
CREATE TABLE public.usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  jobs_count INTEGER NOT NULL DEFAULT 0,
  cpu_seconds INTEGER NOT NULL DEFAULT 0,
  gpu_seconds INTEGER NOT NULL DEFAULT 0,
  storage_bytes BIGINT NOT NULL DEFAULT 0,
  credits_used NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period_start)
);

-- Indexes
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions_internal(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions_internal(status);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_vouchers_code ON public.vouchers(code);
CREATE INDEX idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX idx_jobs_idempotency_key ON public.jobs(idempotency_key);
CREATE INDEX idx_usage_metrics_user_period ON public.usage_metrics(user_id, period_start);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions_internal FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON public.vouchers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions_internal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Plans policies (public read for active/visible plans)
CREATE POLICY "Anyone can view active visible plans" ON public.plans
  FOR SELECT USING (is_active = true AND is_visible = true);

CREATE POLICY "Admins can manage plans" ON public.plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Wallets policies
CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets" ON public.wallets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update wallets" ON public.wallets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions_internal
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions_internal
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Vouchers policies
CREATE POLICY "Admins can manage vouchers" ON public.vouchers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Voucher usage policies
CREATE POLICY "Users can view own voucher usage" ON public.voucher_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all voucher usage" ON public.voucher_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Jobs policies
CREATE POLICY "Users can view own jobs" ON public.jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all jobs" ON public.jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all jobs" ON public.jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Feature flags policies
CREATE POLICY "Anyone can view active feature flags" ON public.feature_flags
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage feature flags" ON public.feature_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Usage metrics policies
CREATE POLICY "Users can view own usage metrics" ON public.usage_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage metrics" ON public.usage_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- IMPORTANT: This function runs AFTER auth.users insert
  -- We must NOT raise exceptions or the auth signup will fail

  BEGIN
    -- Get Free plan ID
    SELECT id INTO free_plan_id FROM public.plans WHERE slug = 'free' LIMIT 1;

    -- Create user profile (only if not exists)
    INSERT INTO public.users (id, email, role, metadata)
    VALUES (
      NEW.id,
      NEW.email,
      'user',
      jsonb_build_object(
        'full_name', COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'avatar_url', COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
      )
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create wallet with Free plan (only if not exists)
    INSERT INTO public.wallets (user_id, balance_credits, reserved_credits)
    VALUES (NEW.id, 100, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Create subscription to Free plan (only if not exists)
    IF free_plan_id IS NOT NULL THEN
      INSERT INTO public.subscriptions_internal (
        user_id,
        plan_id,
        status,
        current_period_start,
        current_period_end
      ) VALUES (
        NEW.id,
        free_plan_id,
        'active',
        NOW(),
        NOW() + INTERVAL '1 year'
      )
      ON CONFLICT (user_id, plan_id) DO NOTHING;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the auth signup
      RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  END;

  -- Always return NEW to allow auth signup to succeed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Tool costs configuration table
CREATE TABLE IF NOT EXISTS public.tool_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id TEXT NOT NULL UNIQUE,
  tool_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ai-audio', 'audio-basic', 'video')),
  credits_per_minute NUMERIC(10, 2) NOT NULL DEFAULT 0,
  base_credits NUMERIC(10, 2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default tool costs (skip if already exists)
INSERT INTO public.tool_costs (tool_id, tool_name, category, credits_per_minute, base_credits, description) VALUES
-- AI Audio Tools (expensive - GPU required)
('stem-splitter', 'Stem Splitter', 'ai-audio', 10, 5, 'TÃ¡ch nháº¡c thÃ nh vocals, drums, bass, other - AI model'),
('audio-enhance', 'Audio Enhance', 'ai-audio', 8, 3, 'NÃ¢ng cao cháº¥t lÆ°á»£ng audio vá»›i AI'),
('de-reverb', 'De-Reverb', 'ai-audio', 7, 3, 'Khá»­ tiáº¿ng vang vá»›i AI'),
('auto-subtitle', 'Auto Subtitle', 'ai-audio', 5, 2, 'Tá»± Ä‘á»™ng táº¡o phá»¥ Ä‘á» vá»›i Whisper AI'),
('text-to-speech', 'Text-to-Speech', 'ai-audio', 3, 1, 'Chuyá»ƒn vÄƒn báº£n thÃ nh giá»ng nÃ³i'),

-- Basic Audio Tools (cheap - CPU only)
('audio-cut-join', 'Audio Cut & Join', 'audio-basic', 1, 0.5, 'Cáº¯t vÃ  ghÃ©p audio Ä‘Æ¡n giáº£n'),
('pitch-tempo', 'Pitch & Tempo', 'audio-basic', 1.5, 0.5, 'Thay Ä‘á»•i cao Ä‘á»™ vÃ  tá»‘c Ä‘á»™'),
('volume-normalize', 'Volume & Normalize', 'audio-basic', 1, 0.5, 'Äiá»u chá»‰nh Ã¢m lÆ°á»£ng'),
('online-recorder', 'Online Recorder', 'audio-basic', 0.5, 0, 'Ghi Ã¢m trá»±c tuyáº¿n'),

-- Video Tools (medium - CPU/GPU)
('video-downloader', 'Video Downloader', 'video', 2, 1, 'Táº£i video tá»« YouTube, TikTok, etc')
ON CONFLICT (tool_id) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tool_costs_tool_id ON public.tool_costs(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_costs_category ON public.tool_costs(category);

-- Enable RLS
ALTER TABLE public.tool_costs ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read tool costs
DROP POLICY IF EXISTS "Tool costs are viewable by everyone" ON public.tool_costs;
CREATE POLICY "Tool costs are viewable by everyone"
  ON public.tool_costs
  FOR SELECT
  USING (true);

-- Policy: Only admins can modify tool costs
DROP POLICY IF EXISTS "Only admins can modify tool costs" ON public.tool_costs;
CREATE POLICY "Only admins can modify tool costs"
  ON public.tool_costs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_tool_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_tool_costs_updated_at ON public.tool_costs;
CREATE TRIGGER update_tool_costs_updated_at
  BEFORE UPDATE ON public.tool_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tool_costs_updated_at();

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
  ('maintenance_mode', '{"enabled": false, "message": "Há»‡ thá»‘ng Ä‘ang báº£o trÃ¬. Vui lÃ²ng quay láº¡i sau."}'::jsonb, 'Cháº¿ Ä‘á»™ báº£o trÃ¬ toÃ n há»‡ thá»‘ng'),
  ('tools_enabled', '{"stem-splitter": true, "audio-enhance": true, "de-reverb": true, "auto-subtitle": true, "text-to-speech": true, "cut-join": true, "pitch-tempo": true, "volume-normalize": true, "online-recorder": true, "video-downloader": true}'::jsonb, 'Báº­t/táº¯t tá»«ng tool'),
  ('registration_enabled', '{"enabled": true}'::jsonb, 'Cho phÃ©p Ä‘Äƒng kÃ½ user má»›i'),
  ('max_file_size_mb', '{"free": 50, "starter": 200, "pro": 500, "enterprise": 2000}'::jsonb, 'Giá»›i háº¡n kÃ­ch thÆ°á»›c file theo plan'),
  ('rate_limits', '{"jobs_per_hour": 10, "jobs_per_day": 100}'::jsonb, 'Giá»›i háº¡n sá»‘ jobs')
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

-- Add missing columns to jobs table
-- This migration adds columns that are used by the application but missing from the schema

-- Add metadata column (stores original filename, file size, file type, etc.)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add tool_id column (alias for tool_type, used by frontend)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS tool_id TEXT;

-- Add input_file_path column (stores the storage path)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS input_file_path TEXT;

-- Add output_file_path column (stores the result file path)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS output_file_path TEXT;

-- Add output_file_url column (stores the result file URL)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS output_file_url TEXT;

-- Make input_file_url nullable (for jobs like video-downloader that don't have input files)
ALTER TABLE public.jobs
ALTER COLUMN input_file_url DROP NOT NULL;

-- Make requirements nullable with default (for simpler job creation)
ALTER TABLE public.jobs
ALTER COLUMN requirements DROP NOT NULL,
ALTER COLUMN requirements SET DEFAULT '{}'::jsonb;

-- Make cost_estimate nullable with default (calculated later)
ALTER TABLE public.jobs
ALTER COLUMN cost_estimate DROP NOT NULL,
ALTER COLUMN cost_estimate SET DEFAULT 0;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_metadata ON public.jobs USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_jobs_tool_id ON public.jobs(tool_id);
CREATE INDEX IF NOT EXISTS idx_jobs_output_file_path ON public.jobs(output_file_path);

-- Add comments for documentation
COMMENT ON COLUMN public.jobs.metadata IS 'Additional job metadata including original filename, file size, file type, and tool-specific parameters';
COMMENT ON COLUMN public.jobs.tool_id IS 'Tool identifier (alias for tool_type, used by frontend)';
COMMENT ON COLUMN public.jobs.input_file_path IS 'Storage path of the input file';
COMMENT ON COLUMN public.jobs.output_file_path IS 'Storage path of the output file';
COMMENT ON COLUMN public.jobs.output_file_url IS 'Public URL of the output file';

-- Add Google OAuth columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_refresh_token ON public.users(google_refresh_token) WHERE google_refresh_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.users.google_refresh_token IS 'Google OAuth refresh token for Drive access';
COMMENT ON COLUMN public.users.google_access_token IS 'Google OAuth access token (cached)';
COMMENT ON COLUMN public.users.google_token_expires_at IS 'When the access token expires';

-- Create uploads bucket for video/audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  524288000, -- 500MB max file size
  ARRAY[
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/flac',
    'audio/aac',
    'audio/x-m4a',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/srt',
    'text/vtt',
    'application/x-subrip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Policy: Allow public read access
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'uploads');

-- Policy: Allow users to delete their own files
CREATE POLICY "Allow users to delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow users to update their own files
CREATE POLICY "Allow users to update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table to store user's Google OAuth tokens
CREATE TABLE IF NOT EXISTS google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tokens
CREATE POLICY "Users can view own tokens"
ON google_tokens
FOR SELECT
TO authenticated
USING (user_email = auth.jwt()->>'email');

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert own tokens"
ON google_tokens
FOR INSERT
TO authenticated
WITH CHECK (user_email = auth.jwt()->>'email');

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update own tokens"
ON google_tokens
FOR UPDATE
TO authenticated
USING (user_email = auth.jwt()->>'email');

-- Index for faster lookups
CREATE INDEX idx_google_tokens_email ON google_tokens(user_email);

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('success', 'error', 'warning', 'info')),
  is_active BOOLEAN DEFAULT true,
  show_once BOOLEAN DEFAULT false, -- Show only once per user
  priority INTEGER DEFAULT 0, -- Higher priority shows first
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create user_seen_announcements table to track which users have seen which announcements
CREATE TABLE IF NOT EXISTS public.user_seen_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_seen_announcements ENABLE ROW LEVEL SECURITY;

-- Policies for announcements
CREATE POLICY "Anyone can view active announcements"
ON public.announcements FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (start_date IS NULL OR start_date <= NOW())
  AND (end_date IS NULL OR end_date >= NOW())
);

CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policies for user_seen_announcements
CREATE POLICY "Users can view their own seen announcements"
ON public.user_seen_announcements FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own seen announcements"
ON public.user_seen_announcements FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_announcements_active ON public.announcements(is_active, priority DESC);
CREATE INDEX idx_announcements_dates ON public.announcements(start_date, end_date);
CREATE INDEX idx_user_seen_announcements_user ON public.user_seen_announcements(user_id);
CREATE INDEX idx_user_seen_announcements_announcement ON public.user_seen_announcements(announcement_id);

-- Insert sample announcement
INSERT INTO public.announcements (title, message, type, is_active, priority)
VALUES (
  'ChÃ o má»«ng Ä‘áº¿n vá»›i X-Sonic!',
  'Há»‡ thá»‘ng xá»­ lÃ½ audio/video AI máº¡nh máº½. HÃ£y khÃ¡m phÃ¡ cÃ¡c cÃ´ng cá»¥ cá»§a chÃºng tÃ´i!',
  'info',
  true,
  10
);

-- Rename transactions table to wallet_transactions (only if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public'
             AND table_name = 'transactions') THEN

    -- Rename table
    ALTER TABLE public.transactions RENAME TO wallet_transactions;

    -- Update indexes
    ALTER INDEX IF EXISTS idx_transactions_user_id RENAME TO idx_wallet_transactions_user_id;
    ALTER INDEX IF EXISTS idx_transactions_created_at RENAME TO idx_wallet_transactions_created_at;

  END IF;
END $$;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can create transactions" ON public.wallet_transactions;

-- Drop new policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can create wallet transactions" ON public.wallet_transactions;

-- Create new policies for wallet_transactions
CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallet transactions" ON public.wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create wallet transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add reason column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'wallet_transactions'
                 AND column_name = 'reason') THEN
    ALTER TABLE public.wallet_transactions ADD COLUMN reason TEXT;
  END IF;
END $$;

-- Make wallet_id nullable since we're using user_id
DO $$
BEGIN
  ALTER TABLE public.wallet_transactions ALTER COLUMN wallet_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Update existing records to have reason from description
UPDATE public.wallet_transactions SET reason = description WHERE reason IS NULL;

-- Add comment
COMMENT ON TABLE public.wallet_transactions IS 'Stores all wallet credit transactions for users';

-- Create payment_requests table
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  payment_method_id UUID NOT NULL REFERENCES public.payment_methods(id),
  amount NUMERIC(10, 2) NOT NULL,
  transfer_content TEXT,
  proof_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.users(id),
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_methods table if not exists
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_type TEXT NOT NULL CHECK (method_type IN ('bank_transfer', 'momo', 'zalopay', 'other')),
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own payment requests" ON public.payment_requests;
DROP POLICY IF EXISTS "Users can create own payment requests" ON public.payment_requests;
DROP POLICY IF EXISTS "Admins can view all payment requests" ON public.payment_requests;
DROP POLICY IF EXISTS "Admins can update payment requests" ON public.payment_requests;
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.payment_methods;

-- Payment requests policies
CREATE POLICY "Users can view own payment requests" ON public.payment_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payment requests" ON public.payment_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment requests" ON public.payment_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update payment requests" ON public.payment_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Payment methods policies
CREATE POLICY "Anyone can view active payment methods" ON public.payment_methods
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage payment methods" ON public.payment_methods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON public.payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON public.payment_requests(created_at DESC);

-- Drop existing functions if they exist (for idempotency)
DROP FUNCTION IF EXISTS approve_payment_request(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS reject_payment_request(UUID, UUID, TEXT);

-- Function to approve payment request
CREATE OR REPLACE FUNCTION approve_payment_request(
  request_id UUID,
  admin_id UUID,
  note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request payment_requests%ROWTYPE;
  v_plan plans%ROWTYPE;
  v_wallet wallets%ROWTYPE;
  v_new_balance NUMERIC;
BEGIN
  -- Get payment request
  SELECT * INTO v_request FROM payment_requests WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Payment request already processed';
  END IF;
  
  -- Get plan details
  SELECT * INTO v_plan FROM plans WHERE id = v_request.plan_id;
  
  -- Get user wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = v_request.user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_wallet.balance_credits + v_plan.credits_monthly;
  
  -- Update wallet
  UPDATE wallets 
  SET balance_credits = v_new_balance,
      updated_at = NOW()
  WHERE user_id = v_request.user_id;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (
    user_id,
    wallet_id,
    type,
    amount,
    balance_after,
    reason,
    description,
    admin_id,
    admin_note,
    reference_type,
    reference_id,
    receipt_url,
    metadata
  ) VALUES (
    v_request.user_id,
    v_wallet.id,
    'credit',
    v_plan.credits_monthly,
    v_new_balance,
    'Payment approved - ' || v_plan.name,
    'Payment approved for plan: ' || v_plan.name,
    admin_id,
    note,
    'payment_request',
    request_id,
    v_request.proof_image_url,
    jsonb_build_object(
      'plan_id', v_plan.id,
      'plan_name', v_plan.name,
      'amount_paid', v_request.amount
    )
  );
  
  -- Update payment request
  UPDATE payment_requests
  SET status = 'approved',
      approved_by = admin_id,
      approved_at = NOW(),
      admin_note = note,
      updated_at = NOW()
  WHERE id = request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'credits_added', v_plan.credits_monthly,
    'new_balance', v_new_balance
  );
END;
$$;

-- Function to reject payment request
CREATE OR REPLACE FUNCTION reject_payment_request(
  request_id UUID,
  admin_id UUID,
  note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request payment_requests%ROWTYPE;
BEGIN
  -- Get payment request
  SELECT * INTO v_request FROM payment_requests WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Payment request already processed';
  END IF;
  
  -- Update payment request
  UPDATE payment_requests
  SET status = 'rejected',
      rejected_by = admin_id,
      rejected_at = NOW(),
      admin_note = note,
      updated_at = NOW()
  WHERE id = request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payment request rejected'
  );
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_payment_requests_updated_at 
  BEFORE UPDATE ON public.payment_requests 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at 
  BEFORE UPDATE ON public.payment_methods 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default payment methods
INSERT INTO public.payment_methods (method_type, bank_name, account_number, account_name, is_active)
VALUES 
  ('bank_transfer', 'Vietcombank', '1234567890', 'NGUYEN VAN A', true),
  ('momo', 'MoMo', '0123456789', 'NGUYEN VAN A', true)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.payment_requests IS 'Stores payment requests from users for plan purchases';
COMMENT ON TABLE public.payment_methods IS 'Stores available payment methods';

