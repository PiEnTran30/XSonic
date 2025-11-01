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
('stem-splitter', 'Stem Splitter', 'ai-audio', 10, 5, 'Tách nhạc thành vocals, drums, bass, other - AI model'),
('audio-enhance', 'Audio Enhance', 'ai-audio', 8, 3, 'Nâng cao chất lượng audio với AI'),
('de-reverb', 'De-Reverb', 'ai-audio', 7, 3, 'Khử tiếng vang với AI'),
('auto-subtitle', 'Auto Subtitle', 'ai-audio', 5, 2, 'Tự động tạo phụ đề với Whisper AI'),
('text-to-speech', 'Text-to-Speech', 'ai-audio', 3, 1, 'Chuyển văn bản thành giọng nói'),

-- Basic Audio Tools (cheap - CPU only)
('audio-cut-join', 'Audio Cut & Join', 'audio-basic', 1, 0.5, 'Cắt và ghép audio đơn giản'),
('pitch-tempo', 'Pitch & Tempo', 'audio-basic', 1.5, 0.5, 'Thay đổi cao độ và tốc độ'),
('volume-normalize', 'Volume & Normalize', 'audio-basic', 1, 0.5, 'Điều chỉnh âm lượng'),
('online-recorder', 'Online Recorder', 'audio-basic', 0.5, 0, 'Ghi âm trực tuyến'),

-- Video Tools (medium - CPU/GPU)
('video-downloader', 'Video Downloader', 'video', 2, 1, 'Tải video từ YouTube, TikTok, etc')
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

