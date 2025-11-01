import { ToolType, JobStatus, OutputFile } from "./database";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface UploadInitRequest {
  filename: string;
  size: number;
  mime_type: string;
  tool_type: ToolType;
}

export interface UploadInitResponse {
  upload_id: string;
  upload_url: string;
  file_url: string;
}

export interface ToolJobRequest {
  input_file_url: string;
  parameters: Record<string, any>;
  idempotency_key?: string;
  delete_on_complete?: boolean;
}

export interface ToolJobResponse {
  job_id: string;
  estimated_cost: number;
  estimated_duration_seconds: number;
  status: JobStatus;
}

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  progress: number;
  progress_message: string | null;
  output_files: OutputFile[];
  error_message: string | null;
  cost_actual: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface WalletResponse {
  balance_credits: number;
  reserved_credits: number;
  available_credits: number;
}

export interface UsageResponse {
  current_period: {
    start: string;
    end: string;
    jobs_count: number;
    cpu_seconds: number;
    gpu_seconds: number;
    storage_bytes: number;
    credits_used: number;
  };
  limits: {
    max_concurrent_jobs: number;
    max_jobs_per_day: number;
    cpu_minutes_monthly: number;
    gpu_minutes_monthly: number;
    max_storage_gb: number;
  };
}

export interface ApplyVoucherRequest {
  code: string;
}

export interface ApplyVoucherResponse {
  credits_added: number;
  new_balance: number;
}
