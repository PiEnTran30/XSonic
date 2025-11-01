"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface AutoSubtitleProps {
  onUploadComplete: (jobId: string, fileUrl: string) => void;
}

export function AutoSubtitle({ onUploadComplete }: AutoSubtitleProps) {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("vi");
  const [format, setFormat] = useState<"srt" | "vtt" | "txt">("srt");
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
      setError("Vui lòng chọn file audio/video");
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
      const idempotencyKey = `${user.id}-auto-subtitle-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: user.id,
          tool_type: "auto-subtitle",
          tool_id: "auto-subtitle",
          status: "pending",
          input_file_url: publicUrl,
          idempotency_key: idempotencyKey,
          metadata: {
            language,
            format,
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
          <span className="font-medium">AI-Powered Speech Recognition (ASR)</span>
        </div>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Chọn file audio/video</label>
        <div className="relative">
          <input
            type="file"
            accept="audio/*,video/*"
            onChange={handleFileChange}
            className="hidden"
            id="media-file"
          />
          <label
            htmlFor="media-file"
            className="flex items-center justify-center gap-2 w-full px-4 py-8 border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-lg cursor-pointer transition-all"
          >
            <Upload className="h-6 w-6" />
            <span>{file ? file.name : "Click để chọn file"}</span>
          </label>
        </div>
      </div>

      {/* Language Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Ngôn ngữ</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
          <option value="zh">中文 (Chinese)</option>
          <option value="ja">日本語 (Japanese)</option>
          <option value="ko">한국어 (Korean)</option>
          <option value="th">ไทย (Thai)</option>
          <option value="auto">Auto Detect</option>
        </select>
      </div>

      {/* Format Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Định dạng phụ đề</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setFormat("srt")}
            className={`p-3 rounded-lg border-2 transition-all ${
              format === "srt"
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <div className="font-medium">SRT</div>
            <div className="text-xs text-gray-400 mt-1">SubRip</div>
          </button>

          <button
            onClick={() => setFormat("vtt")}
            className={`p-3 rounded-lg border-2 transition-all ${
              format === "vtt"
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <div className="font-medium">VTT</div>
            <div className="text-xs text-gray-400 mt-1">WebVTT</div>
          </button>

          <button
            onClick={() => setFormat("txt")}
            className={`p-3 rounded-lg border-2 transition-all ${
              format === "txt"
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <div className="font-medium">TXT</div>
            <div className="text-xs text-gray-400 mt-1">Plain Text</div>
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="text-sm space-y-2">
          <div className="font-medium mb-2">Tính năng:</div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <span>Tự động nhận diện giọng nói thành text</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <span>Hỗ trợ nhiều ngôn ngữ (Việt, Anh, Trung, Nhật, Hàn...)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <span>Tự động đánh dấu thời gian (timestamp)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <span>Xuất file SRT, VTT, hoặc TXT</span>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="p-4 bg-white/5 rounded-lg">
        <div className="text-sm space-y-2">
          <div className="font-medium mb-2">Ứng dụng:</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <span>📹</span>
              <span className="text-gray-400">YouTube videos</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🎬</span>
              <span className="text-gray-400">Phim/Series</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🎓</span>
              <span className="text-gray-400">Bài giảng</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🎙️</span>
              <span className="text-gray-400">Podcast</span>
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
            Tạo Phụ Đề
          </>
        )}
      </button>

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Hỗ trợ: MP3, WAV, MP4, AVI, MOV, MKV</p>
        <p>• Kích thước tối đa: 500MB</p>
        <p>• Thời gian xử lý: ~2-5 phút (tùy độ dài)</p>
        <p>• Sử dụng Google Gemini AI cho độ chính xác cao</p>
      </div>
    </div>
  );
}

