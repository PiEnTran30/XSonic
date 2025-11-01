"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface AudioEnhanceProps {
  onUploadComplete: (jobId: string, fileUrl: string) => void;
}

export function AudioEnhance({ onUploadComplete }: AudioEnhanceProps) {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [noiseReduction, setNoiseReduction] = useState(50);
  const [bassBoost, setBassBoost] = useState(0);
  const [trebleBoost, setTrebleBoost] = useState(0);
  const [compression, setCompression] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError("Vui lòng chọn file audio");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Vui lòng đăng nhập để sử dụng tính năng này");
        setLoading(false);
        return;
      }

      // Upload file to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("uploads").getPublicUrl(fileName);

      // Create job
      const idempotencyKey = `${user.id}-audio-enhance-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: user.id,
          tool_type: "audio-enhance",
          tool_id: "audio-enhance",
          status: "pending",
          input_file_url: publicUrl,
          idempotency_key: idempotencyKey,
          metadata: {
            noise_reduction: noiseReduction,
            bass_boost: bassBoost,
            treble_boost: trebleBoost,
            compression,
            originalFileName: file.name,
          },
          requirements: { cpu: true, ai: true },
          cost_estimate: 5,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      setSuccess(true);
      onUploadComplete(job.id, publicUrl);
    } catch (err: any) {
      console.error("Process error:", err);
      setError(err.message || "Có lỗi xảy ra khi xử lý file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Badge */}
      <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-blue-400">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">AI-Powered Audio Enhancement</span>
        </div>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Chọn file audio</label>
        <div className="relative">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
            id="audio-file"
          />
          <label
            htmlFor="audio-file"
            className="flex items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-lg cursor-pointer transition-all"
          >
            <Upload className="h-6 w-6" />
            <span>{file ? file.name : "Click để chọn file"}</span>
          </label>
        </div>
      </div>

      {/* Enhancement Controls */}
      <div className="space-y-4 p-4 bg-white/5 rounded-lg">
        {/* Noise Reduction */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Khử nhiễu: {noiseReduction}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={noiseReduction}
            onChange={(e) => setNoiseReduction(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-500">
            Loại bỏ tiếng ồn nền, tiếng xì, tiếng rè
          </div>
        </div>

        {/* Bass Boost */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Bass Boost: {bassBoost > 0 ? "+" : ""}{bassBoost} dB
          </label>
          <input
            type="range"
            min="-10"
            max="10"
            value={bassBoost}
            onChange={(e) => setBassBoost(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-500">
            Tăng/giảm âm trầm (bass)
          </div>
        </div>

        {/* Treble Boost */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Treble Boost: {trebleBoost > 0 ? "+" : ""}{trebleBoost} dB
          </label>
          <input
            type="range"
            min="-10"
            max="10"
            value={trebleBoost}
            onChange={(e) => setTrebleBoost(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-500">
            Tăng/giảm âm cao (treble)
          </div>
        </div>

        {/* Compression */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Compression: {compression}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={compression}
            onChange={(e) => setCompression(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-500">
            Cân bằng âm lượng giữa các phần
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="text-sm space-y-1">
          <div className="font-medium mb-2">Cài đặt hiện tại:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Khử nhiễu:</span>
              <span className="font-medium">{noiseReduction}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Bass:</span>
              <span className="font-medium">{bassBoost > 0 ? "+" : ""}{bassBoost} dB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Treble:</span>
              <span className="font-medium">{trebleBoost > 0 ? "+" : ""}{trebleBoost} dB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Compression:</span>
              <span className="font-medium">{compression}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-400">
          <CheckCircle className="h-5 w-5" />
          <span>Đã tạo job thành công! Đang xử lý...</span>
        </div>
      )}

      {/* Process Button */}
      <button
        onClick={handleProcess}
        disabled={loading || !file}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang xử lý...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Enhance Audio
          </>
        )}
      </button>

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Hỗ trợ: MP3, WAV, M4A, AAC, OGG</p>
        <p>• Kích thước tối đa: 200MB</p>
        <p>• Thời gian xử lý: ~2-3 phút</p>
        <p>• Sử dụng AI để phân tích và tối ưu chất lượng audio</p>
      </div>
    </div>
  );
}

