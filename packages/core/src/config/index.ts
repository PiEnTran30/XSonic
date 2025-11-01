import { AppConfig } from "../types/config";

export const loadConfig = (): AppConfig => {
  return {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    },
    redis: {
      url: process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    },
    storage: {
      bucket: process.env.STORAGE_BUCKET || "xsonic-files",
      ttl_days: parseInt(process.env.STORAGE_TTL_DAYS || "7", 10),
    },
    queue: {
      default_timeout: parseInt(process.env.QUEUE_DEFAULT_TIMEOUT || "3600", 10),
      max_retries: parseInt(process.env.QUEUE_MAX_RETRIES || "3", 10),
    },
    gpu: {
      enabled: process.env.GPU_ENABLED === "true",
      allow_cpu_fallback: process.env.ALLOW_CPU_FALLBACK !== "false",
      autostart_cooldown_min: parseInt(process.env.GPU_AUTOSTART_COOLDOWN_MIN || "5", 10),
      autostop_idle_min: parseInt(process.env.GPU_AUTOSTOP_IDLE_MIN || "10", 10),
      runpod_api_key: process.env.RUNPOD_API_KEY,
      runpod_endpoint: process.env.RUNPOD_ENDPOINT,
    },
    billing: {
      hard_limit_enabled: process.env.HARD_LIMIT_ENABLED !== "false",
      cost_per_cpu_second: parseFloat(process.env.COST_PER_CPU_SECOND || "0.01"),
      cost_per_gpu_second: parseFloat(process.env.COST_PER_GPU_SECOND || "0.03"),
      cost_per_gb_storage_day: parseFloat(process.env.COST_PER_GB_STORAGE_DAY || "0.1"),
    },
    downloader: {
      allowed_hosts: (process.env.ALLOWED_DOWNLOAD_HOSTS || "youtube.com,youtu.be,tiktok.com,facebook.com,instagram.com").split(","),
    },
    observability: {
      sentry_dsn: process.env.SENTRY_DSN,
      log_level: process.env.LOG_LEVEL || "info",
    },
  };
};

