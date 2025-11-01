"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Volume2, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface VolumeNormalizeProps {
  onUploadComplete: (jobId: string, fileUrl: string) => void;
}

export function VolumeNormalize({ onUploadComplete }: VolumeNormalizeProps) {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [volume, setVolume] = useState(1.0); // 0.0 to 2.0
  const [normalize, setNormalize] = useState(false);
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
      const idempotencyKey = `${user.id}-volume-normalize-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: user.id,
          tool_type: "volume-normalize",
          tool_id: "volume-normalize",
          status: "pending",
          input_file_url: publicUrl,
          idempotency_key: idempotencyKey,
          metadata: {
            volume,
            normalize,
            originalFileName: file.name,
          },
          requirements: { cpu: true },
          cost_estimate: 1,
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

      {/* Normalize Toggle */}
      <div className="p-4 bg-white/5 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={normalize}
            onChange={(e) => setNormalize(e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <div>
            <div className="font-medium">Normalize Audio</div>
            <div className="text-sm text-gray-400">
              Tự động cân bằng âm lượng về mức chuẩn (-16 LUFS)
            </div>
          </div>
        </label>
      </div>

      {/* Volume Control (disabled if normalize is on) */}
      {!normalize && (
        <div className="space-y-4 p-4 bg-white/5 rounded-lg">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Âm lượng: {(volume * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0% (Tắt tiếng)</span>
              <span>100% (Gốc)</span>
              <span>200% (Gấp đôi)</span>
            </div>
          </div>

          {/* Volume Indicator */}
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-gray-400" />
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                style={{ width: `${(volume / 2) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium">{(volume * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="text-sm space-y-1">
          <div className="font-medium mb-2">Chế độ đã chọn:</div>
          {normalize ? (
            <div className="text-blue-400">
              ✓ Normalize: Tự động cân bằng âm lượng về -16 LUFS
            </div>
          ) : (
            <div className="text-blue-400">
              ✓ Volume: Điều chỉnh thủ công {(volume * 100).toFixed(0)}%
            </div>
          )}
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
            <Volume2 className="h-5 w-5" />
            {normalize ? "Normalize Audio" : "Điều chỉnh Volume"}
          </>
        )}
      </button>

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Hỗ trợ: MP3, WAV, M4A, AAC, OGG</p>
        <p>• Kích thước tối đa: 200MB</p>
        <p>• Thời gian xử lý: ~30 giây</p>
        <p>• Normalize: Cân bằng âm lượng về -16 LUFS (chuẩn streaming)</p>
        <p>• Volume: Tăng/giảm âm lượng từ 0% đến 200%</p>
      </div>
    </div>
  );
}

