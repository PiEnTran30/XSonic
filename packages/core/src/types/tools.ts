import { ToolType, JobRequirements } from "./database";

export interface ToolPlugin {
  type: ToolType;
  name: string;
  description: string;
  category: "ai-audio" | "audio-basic" | "video";
  requirements: JobRequirements;
  costModel: CostModel;
  parameters: ToolParameter[];
  validate: (params: any) => ValidationResult;
  estimateCost: (params: any, fileSize: number, duration?: number) => number;
}

export interface CostModel {
  base_credits: number;
  per_second?: number;
  per_mb?: number;
  gpu_multiplier?: number;
}

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "select" | "range";
  required: boolean;
  default?: any;
  options?: any[];
  min?: number;
  max?: number;
  description: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

// Specific tool parameters
export interface StemSplitParams {
  model: "2stems" | "4stems" | "5stems";
  output_format: "wav" | "mp3" | "flac";
}

export interface AudioEnhanceParams {
  denoise: boolean;
  dereverb: boolean;
  eq_clarity: boolean;
  output_format: "wav" | "mp3" | "flac";
}

export interface DeReverbParams {
  strength: number; // 0-100
  output_format: "wav" | "mp3" | "flac";
}

export interface AutoSubtitleParams {
  language: string;
  model: "tiny" | "base" | "small" | "medium" | "large";
  output_formats: ("srt" | "vtt" | "json")[];
  translate_to?: string;
}

export interface TextToSpeechParams {
  text: string;
  voice: string;
  language: string;
  speed: number; // 0.5-2.0
  output_format: "mp3" | "wav";
}

export interface AudioCutJoinParams {
  operation: "cut" | "join";
  segments?: { start: number; end: number }[];
  files?: string[]; // for join
  output_format: "wav" | "mp3" | "flac";
}

export interface PitchTempoParams {
  pitch_semitones?: number; // -12 to +12
  tempo_factor?: number; // 0.5 to 2.0
  output_format: "wav" | "mp3" | "flac";
}

export interface VolumeNormalizeParams {
  target_lufs: number; // -23 to -9
  peak_limit_db: number; // -3 to 0
  output_format: "wav" | "mp3" | "flac";
}

export interface VideoDownloadParams {
  url: string;
  quality: "best" | "1080p" | "720p" | "480p" | "audio-only";
  format: "mp4" | "webm" | "mp3";
}

export interface VideoEditBasicParams {
  operations: VideoOperation[];
  output_format: "mp4" | "webm";
  output_quality: "high" | "medium" | "low";
}

export interface VideoOperation {
  type: "cut" | "add-bgm" | "overlay-text";
  params: any;
}
