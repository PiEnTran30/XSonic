export interface AppConfig {
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  redis: {
    url: string;
    token: string;
  };
  storage: {
    bucket: string;
    ttl_days: number;
  };
  queue: {
    default_timeout: number;
    max_retries: number;
  };
  gpu: {
    enabled: boolean;
    allow_cpu_fallback: boolean;
    autostart_cooldown_min: number;
    autostop_idle_min: number;
    runpod_api_key?: string;
    runpod_endpoint?: string;
  };
  billing: {
    hard_limit_enabled: boolean;
    cost_per_cpu_second: number;
    cost_per_gpu_second: number;
    cost_per_gb_storage_day: number;
  };
  downloader: {
    allowed_hosts: string[];
  };
  observability: {
    sentry_dsn?: string;
    log_level: string;
  };
}

export interface WorkerConfig {
  type: "cpu" | "gpu";
  ffmpeg_path: string;
  max_concurrent_jobs: number;
  callback_url: string;
}
