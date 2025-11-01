-- Add missing columns to jobs table
-- Run this in Supabase SQL Editor

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

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'jobs'
  AND column_name IN ('metadata', 'tool_id', 'input_file_path', 'output_file_path', 'output_file_url')
ORDER BY column_name;

