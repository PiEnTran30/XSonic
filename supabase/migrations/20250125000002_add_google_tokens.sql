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

