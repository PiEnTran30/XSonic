export interface User {
  id: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  credits_monthly: number;
  features: PlanFeatures;
  limits: PlanLimits;
  is_active: boolean;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanFeatures {
  ai_audio: boolean;
  audio_basic: boolean;
  video_tools: boolean;
  priority_queue: boolean;
  gpu_access: boolean;
  api_access: boolean;
  custom_features?: string[];
}

export interface PlanLimits {
  max_file_size_mb: number;
  max_duration_minutes: number;
  max_concurrent_jobs: number;
  max_storage_gb: number;
  cpu_minutes_monthly: number;
  gpu_minutes_monthly: number;
  max_jobs_per_day: number;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance_credits: number;
  reserved_credits: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInternal {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "paused" | "cancelled" | "expired";
  billing_cycle: "monthly" | "yearly";
  current_period_start: string;
  current_period_end: string;
  renews_at: string | null;
  cancelled_at: string | null;
  pause_reason: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: "credit" | "debit" | "refund" | "adjustment";
  amount: number;
  balance_after: number;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  admin_id: string | null;
  admin_note: string | null;
  receipt_url: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  type: "credits" | "discount_percent" | "discount_fixed";
  value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface VoucherUsage {
  id: string;
  voucher_id: string;
  user_id: string;
  used_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  tool_type: ToolType;
  status: JobStatus;
  priority: number;
  input_file_url: string;
  input_metadata: Record<string, any>;
  output_files: OutputFile[];
  parameters: Record<string, any>;
  requirements: JobRequirements;
  cost_estimate: number;
  cost_actual: number | null;
  progress: number;
  progress_message: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  idempotency_key: string;
  worker_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  ttl_delete_at: string | null;
}

export type JobStatus =
  | "pending"
  | "pending-gpu"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type ToolType =
  | "stem-split"
  | "audio-enhance"
  | "de-reverb"
  | "auto-subtitle"
  | "text-to-speech"
  | "audio-cut-join"
  | "pitch-tempo"
  | "volume-normalize"
  | "video-download"
  | "video-convert"
  | "video-edit-basic"
  | "audio-record";

export interface JobRequirements {
  requires_gpu: boolean;
  requires_cpu: boolean;
  estimated_duration_seconds: number;
  memory_mb: number;
  timeout_seconds: number;
}

export interface OutputFile {
  url: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
  metadata?: Record<string, any>;
}

export interface FeatureFlag {
  id: string;
  key: string;
  value: any;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageMetrics {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  jobs_count: number;
  cpu_seconds: number;
  gpu_seconds: number;
  storage_bytes: number;
  credits_used: number;
  created_at: string;
}
