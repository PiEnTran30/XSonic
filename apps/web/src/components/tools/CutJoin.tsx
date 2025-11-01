"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Scissors, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface CutJoinProps {
  onUploadComplete: (jobId: string, fileUrl: string) => void;
}

export function CutJoin({ onUploadComplete }: CutJoinProps) {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [operation, setOperation] = useState<"cut" | "join">("cut");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
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

    if (operation === "cut" && startTime >= endTime) {
      setError("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc");
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
      const idempotencyKey = `${user.id}-cut-join-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: user.id,
          tool_type: "cut-join",
          tool_id: "cut-join",
          status: "pending",
          input_file_url: publicUrl,
          idempotency_key: idempotencyKey,
          metadata: {
            operation,
            startTime,
            duration: endTime - startTime,
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
      {/* Operation Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Chọn thao tác</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setOperation("cut")}
            className={`p-4 rounded-lg border-2 transition-all ${
              operation === "cut"
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <Scissors className="h-6 w-6 mx-auto mb-2" />
            <div className="font-medium">Cắt Audio</div>
            <div className="text-xs text-gray-400 mt-1">Cắt một đoạn từ file</div>
          </button>
          <button
            onClick={() => setOperation("join")}
            className={`p-4 rounded-lg border-2 transition-all ${
              operation === "join"
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <div className="text-2xl mb-2">🔗</div>
            <div className="font-medium">Ghép Audio</div>
            <div className="text-xs text-gray-400 mt-1">Nối nhiều file lại</div>
          </button>
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

      {/* Cut Parameters */}
      {operation === "cut" && (
        <div className="space-y-4 p-4 bg-white/5 rounded-lg">
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Thời gian bắt đầu (giây): {startTime}s
            </label>
            <input
              type="range"
              min="0"
              max="300"
              value={startTime}
              onChange={(e) => setStartTime(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Thời gian kết thúc (giây): {endTime}s
            </label>
            <input
              type="range"
              min="0"
              max="300"
              value={endTime}
              onChange={(e) => setEndTime(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="text-sm text-gray-400">
            Độ dài: {endTime - startTime} giây
          </div>
        </div>
      )}

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
            <Scissors className="h-5 w-5" />
            {operation === "cut" ? "Cắt Audio" : "Ghép Audio"}
          </>
        )}
      </button>

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Hỗ trợ: MP3, WAV, M4A, AAC, OGG</p>
        <p>• Kích thước tối đa: 200MB</p>
        <p>• Thời gian xử lý: ~30 giây</p>
      </div>
    </div>
  );
}

