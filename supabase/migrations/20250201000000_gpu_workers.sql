-- GPU Workers table
CREATE TABLE public.gpu_workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('ckey', 'runpod', 'vast', 'custom')),
  status TEXT NOT NULL DEFAULT 'stopped' CHECK (status IN ('stopped', 'starting', 'running', 'stopping', 'error')),
  
  -- Connection info
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  ssh_port INTEGER,
  web_terminal_port INTEGER,
  
  -- GPU specs
  gpu_model TEXT,
  gpu_count INTEGER DEFAULT 1,
  cpu_cores INTEGER,
  ram_gb NUMERIC(10, 2),
  storage_gb NUMERIC(10, 2),
  
  -- Provider specific
  provider_id TEXT, -- ID from provider (e.g., ckey instance ID)
  provider_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Pricing
  price_per_hour NUMERIC(10, 4),
  currency TEXT DEFAULT 'VND',
  
  -- Auto management
  auto_start BOOLEAN DEFAULT false,
  auto_stop BOOLEAN DEFAULT true,
  auto_stop_idle_minutes INTEGER DEFAULT 10,
  
  -- Health & metrics
  last_heartbeat TIMESTAMPTZ,
  last_job_at TIMESTAMPTZ,
  total_jobs_processed INTEGER DEFAULT 0,
  total_uptime_seconds INTEGER DEFAULT 0,
  
  -- Rental info
  rented_until TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ
);

-- GPU Worker logs
CREATE TABLE public.gpu_worker_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES public.gpu_workers(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gpu_workers_status ON public.gpu_workers(status);
CREATE INDEX idx_gpu_workers_provider ON public.gpu_workers(provider);
CREATE INDEX idx_gpu_workers_last_heartbeat ON public.gpu_workers(last_heartbeat);
CREATE INDEX idx_gpu_worker_logs_worker_id ON public.gpu_worker_logs(worker_id);
CREATE INDEX idx_gpu_worker_logs_created_at ON public.gpu_worker_logs(created_at);

-- Update jobs table to reference gpu_worker
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS gpu_worker_id UUID REFERENCES public.gpu_workers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_gpu_worker_id ON public.jobs(gpu_worker_id);

-- RLS Policies
ALTER TABLE public.gpu_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpu_worker_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can manage GPU workers
CREATE POLICY "Admins can view all GPU workers"
  ON public.gpu_workers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert GPU workers"
  ON public.gpu_workers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update GPU workers"
  ON public.gpu_workers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete GPU workers"
  ON public.gpu_workers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- GPU worker logs policies
CREATE POLICY "Admins can view GPU worker logs"
  ON public.gpu_worker_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Service role can insert GPU worker logs"
  ON public.gpu_worker_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update gpu_workers updated_at
CREATE OR REPLACE FUNCTION update_gpu_workers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gpu_workers_updated_at
  BEFORE UPDATE ON public.gpu_workers
  FOR EACH ROW
  EXECUTE FUNCTION update_gpu_workers_updated_at();

-- Function to log GPU worker status changes
CREATE OR REPLACE FUNCTION log_gpu_worker_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.gpu_worker_logs (worker_id, level, message, metadata)
    VALUES (
      NEW.id,
      'info',
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gpu_worker_status_change
  AFTER UPDATE ON public.gpu_workers
  FOR EACH ROW
  EXECUTE FUNCTION log_gpu_worker_status_change();

