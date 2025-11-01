"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Music, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface PitchTempoProps {
  onUploadComplete: (jobId: string, fileUrl: string) => void;
}

export function PitchTempo({ onUploadComplete }: PitchTempoProps) {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [pitch, setPitch] = useState(0); // -12 to +12 semitones
  const [tempo, setTempo] = useState(1.0); // 0.5 to 2.0
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
      const idempotencyKey = `${user.id}-pitch-tempo-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: user.id,
          tool_type: "pitch-tempo",
          tool_id: "pitch-tempo",
          status: "pending",
          input_file_url: publicUrl,
          idempotency_key: idempotencyKey,
          metadata: {
            pitch,
            tempo,
            originalFileName: file.name,
          },
          requirements: { cpu: true },
          cost_estimate: 2,
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

      {/* Pitch Control */}
      <div className="space-y-4 p-4 bg-white/5 rounded-lg">
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Pitch (Cao độ): {pitch > 0 ? "+" : ""}{pitch} semitones
          </label>
          <input
            type="range"
            min="-12"
            max="12"
            step="1"
            value={pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>-12 (Thấp hơn)</span>
            <span>0 (Gốc)</span>
            <span>+12 (Cao hơn)</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Tempo (Tốc độ): {tempo}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={tempo}
            onChange={(e) => setTempo(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.5x (Chậm)</span>
            <span>1.0x (Gốc)</span>
            <span>2.0x (Nhanh)</span>
          </div>
        </div>

        {/* Preview */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Pitch:</span>
              <span className="font-medium">
                {pitch === 0 ? "Không đổi" : `${pitch > 0 ? "+" : ""}${pitch} semitones`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tempo:</span>
              <span className="font-medium">
                {tempo === 1.0 ? "Không đổi" : `${tempo}x`}
              </span>
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
            <Music className="h-5 w-5" />
            Thay đổi Pitch & Tempo
          </>
        )}
      </button>

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Hỗ trợ: MP3, WAV, M4A, AAC, OGG</p>
        <p>• Kích thước tối đa: 200MB</p>
        <p>• Thời gian xử lý: ~1-2 phút</p>
        <p>• Pitch: -12 đến +12 semitones (1 octave)</p>
        <p>• Tempo: 0.5x đến 2.0x (chậm/nhanh gấp đôi)</p>
      </div>
    </div>
  );
}

