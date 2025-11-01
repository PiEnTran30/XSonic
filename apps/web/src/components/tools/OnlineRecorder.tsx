"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Download, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface OnlineRecorderProps {
  onUploadComplete?: (jobId: string, fileUrl: string) => void;
}

export function OnlineRecorder({ onUploadComplete }: OnlineRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioURL, setAudioURL] = useState<string>("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioBlob(blob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Error starting recording:", err);
      setError("Không thể truy cập microphone. Vui lòng cho phép quyền truy cập.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        
        // Resume timer
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }
  };

  const deleteRecording = () => {
    setAudioURL("");
    setAudioBlob(null);
    setRecordingTime(0);
    chunksRef.current = [];
  };

  const uploadRecording = async () => {
    if (!audioBlob) return;

    try {
      setUploading(true);
      setError("");

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Bạn cần đăng nhập để upload");
      }

      // Convert webm to mp3 filename
      const timestamp = Date.now();
      const fileName = `${user.id}/${timestamp}_recording.webm`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, audioBlob, {
          contentType: "audio/webm",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);

      // Create job
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: user.id,
          tool_id: "online-recorder",
          input_file_path: fileName,
          input_file_url: publicUrl,
          status: "pending",
          metadata: {
            original_filename: `recording_${timestamp}.webm`,
            file_size: audioBlob.size,
            file_type: "audio/webm",
            duration: recordingTime,
            format: "webm",
          },
        })
        .select()
        .single();

      if (jobError) {
        throw new Error(`Failed to create job: ${jobError.message}`);
      }

      // Call onUploadComplete callback
      if (onUploadComplete && jobData) {
        onUploadComplete(jobData.id, publicUrl);
      }

      // Reset state
      deleteRecording();
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20 border-2 border-red-500/30 mb-4">
            <Mic className={`h-16 w-16 ${isRecording ? "text-red-500 animate-pulse" : "text-gray-400"}`} />
          </div>
          <div className="text-4xl font-bold font-mono mb-2">
            {formatTime(recordingTime)}
          </div>
          {isRecording && (
            <div className="text-sm text-gray-400">
              {isPaused ? "Đã tạm dừng" : "Đang ghi âm..."}
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording && !audioURL && (
            <button
              onClick={startRecording}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
            >
              <Mic className="h-5 w-5" />
              Bắt đầu ghi âm
            </button>
          )}

          {isRecording && (
            <>
              <button
                onClick={pauseRecording}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              >
                {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                {isPaused ? "Tiếp tục" : "Tạm dừng"}
              </button>
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <Square className="h-5 w-5" />
                Dừng
              </button>
            </>
          )}
        </div>
      </div>

      {/* Audio Preview */}
      {audioURL && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-4">Bản ghi âm của bạn</h3>
          
          <audio
            src={audioURL}
            controls
            className="w-full mb-4"
            style={{ filter: "invert(1) hue-rotate(180deg)" }}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={uploadRecording}
              disabled={uploading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-5 w-5" />
              {uploading ? "Đang upload..." : "Upload & Xử lý"}
            </button>
            <button
              onClick={deleteRecording}
              disabled={uploading}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-5 w-5" />
              Xóa
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h4 className="font-bold mb-2">Hướng dẫn:</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Click "Bắt đầu ghi âm" và cho phép truy cập microphone</li>
          <li>• Bạn có thể tạm dừng và tiếp tục ghi âm</li>
          <li>• Click "Dừng" khi hoàn thành</li>
          <li>• Nghe lại và upload để lưu trữ</li>
        </ul>
      </div>
    </div>
  );
}

