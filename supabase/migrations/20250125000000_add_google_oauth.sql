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

