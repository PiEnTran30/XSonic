"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface StemSplitterProps {
  onUploadComplete: (jobId: string, fileUrl: string) => void;
}

export function StemSplitter({ onUploadComplete }: StemSplitterProps) {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
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
      const idempotencyKey = `${user.id}-stem-splitter-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: user.id,
          tool_type: "stem-splitter",
          tool_id: "stem-splitter",
          status: "pending",
          input_file_url: publicUrl,
          idempotency_key: idempotencyKey,
          metadata: {
            originalFileName: file.name,
          },
          requirements: { cpu: true, ai: true },
          cost_estimate: 10,
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
          <span className="font-medium">AI-Powered Stem Separation</span>
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

      {/* Output Preview */}
      <div className="p-4 bg-white/5 rounded-lg space-y-3">
        <div className="font-medium mb-3">Kết quả sẽ tách thành:</div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="text-2xl mb-1">🎤</div>
            <div className="font-medium">Vocals</div>
            <div className="text-xs text-gray-400">Giọng hát</div>
          </div>

          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="text-2xl mb-1">🥁</div>
            <div className="font-medium">Drums</div>
            <div className="text-xs text-gray-400">Trống</div>
          </div>

          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="text-2xl mb-1">🎸</div>
            <div className="font-medium">Bass</div>
            <div className="text-xs text-gray-400">Bass</div>
          </div>

          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="text-2xl mb-1">🎹</div>
            <div className="font-medium">Other</div>
            <div className="text-xs text-gray-400">Nhạc cụ khác</div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="text-sm space-y-2">
          <div className="font-medium mb-2">Tính năng:</div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <span>Tách vocals (giọng hát) ra khỏi nhạc nền</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <span>Tách drums, bass, và các nhạc cụ khác</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <span>Chất lượng cao, sử dụng AI model tiên tiến</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <span>Tải xuống từng stem riêng biệt</span>
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
            Tách Stems
          </>
        )}
      </button>

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Hỗ trợ: MP3, WAV, M4A, AAC, OGG</p>
        <p>• Kích thước tối đa: 200MB</p>
        <p>• Thời gian xử lý: ~3-5 phút</p>
        <p>• Sử dụng AI model Demucs để tách stems chất lượng cao</p>
        <p>• Kết quả: 4 file riêng biệt (Vocals, Drums, Bass, Other)</p>
      </div>
    </div>
  );
}

