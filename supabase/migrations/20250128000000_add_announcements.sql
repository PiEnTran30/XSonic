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
  'Chào mừng đến với X-Sonic!',
  'Hệ thống xử lý audio/video AI mạnh mẽ. Hãy khám phá các công cụ của chúng tôi!',
  'info',
  true,
  10
);

