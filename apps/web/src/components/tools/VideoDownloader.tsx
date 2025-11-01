"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Download, Loader2, CheckCircle, AlertCircle, Video, Music, ExternalLink } from "lucide-react";

interface VideoDownloaderProps {
  onUploadComplete: (jobId: string, fileUrl: string) => void;
}

interface JobStatus {
  id: string;
  status: string;
  progress: number;
  progress_message: string;
  output_file_url: string;
  metadata: any;
  error_message: string;
}

export function VideoDownloader({ onUploadComplete }: VideoDownloaderProps) {
  const supabase = createClient();
  const [url, setUrl] = useState("");
  const [quality, setQuality] = useState<"highest" | "lowest" | "audio">("highest");
  const [format, setFormat] = useState<"mp4" | "mp3">("mp4");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Job tracking
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
  const [downloadSpeed, setDownloadSpeed] = useState<string>("");
  const [eta, setEta] = useState<string>("");
  const [usePolling, setUsePolling] = useState(true); // Use polling by default until Realtime is confirmed working

  // Gmail modal
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [userGmail, setUserGmail] = useState("");
  const [pendingDownload, setPendingDownload] = useState<{
    url: string;
    format: "mp4" | "mp3";
    quality: string;
  } | null>(null);

  // Subscribe to job updates
  useEffect(() => {
    if (!currentJob) return;

    console.log("[VideoDownloader] Subscribing to job:", currentJob.id);

    const channel = supabase
      .channel(`job_${currentJob.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${currentJob.id}`,
        },
        (payload) => {
          console.log("[VideoDownloader] Received update:", payload);
          const updatedJob = payload.new as JobStatus;
          setCurrentJob(updatedJob);

          // Parse progress message for speed and ETA
          if (updatedJob.progress_message) {
            const speedMatch = updatedJob.progress_message.match(/(\d+\.?\d*\s*[KMG]?B\/s)/);
            const etaMatch = updatedJob.progress_message.match(/ETA\s+(\d+:\d+)/);

            if (speedMatch) setDownloadSpeed(speedMatch[1]);
            if (etaMatch) setEta(etaMatch[1]);
          }

          // Job completed
          if (updatedJob.status === "completed") {
            console.log("[VideoDownloader] Job completed!");
            setSuccess(true);
            setLoading(false);
          }

          // Job failed
          if (updatedJob.status === "failed") {
            console.log("[VideoDownloader] Job failed:", updatedJob.error_message);
            setError(updatedJob.error_message || "Job failed");
            setLoading(false);
          }
        }
      )
      .subscribe((status) => {
        console.log("[VideoDownloader] Subscription status:", status);

        // If subscription fails, use polling instead
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[VideoDownloader] Realtime failed, switching to polling");
          setUsePolling(true);
        }
      });

    return () => {
      console.log("[VideoDownloader] Unsubscribing from job:", currentJob.id);
      supabase.removeChannel(channel);
    };
  }, [currentJob, supabase]);

  // Fallback polling if Realtime doesn't work
  useEffect(() => {
    if (!currentJob || !usePolling) return;
    if (currentJob.status === "completed" || currentJob.status === "failed") return;

    console.log("[VideoDownloader] Starting polling for job:", currentJob.id);

    const pollInterval = setInterval(async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", currentJob.id)
        .single();

      if (job) {
        console.log("[VideoDownloader] Polled job:", job.progress, job.progress_message);
        setCurrentJob(job as JobStatus);

        // Parse progress message
        if (job.progress_message) {
          const speedMatch = job.progress_message.match(/(\d+\.?\d*\s*[KMG]?B\/s)/);
          const etaMatch = job.progress_message.match(/ETA\s+(\d+:\d+)/);

          if (speedMatch) setDownloadSpeed(speedMatch[1]);
          if (etaMatch) setEta(etaMatch[1]);
        }

        // Job completed
        if (job.status === "completed") {
          console.log("[VideoDownloader] Job completed (polling)!");
          setSuccess(true);
          setLoading(false);
          clearInterval(pollInterval);
        }

        // Job failed
        if (job.status === "failed") {
          console.log("[VideoDownloader] Job failed (polling):", job.error_message);
          setError(job.error_message || "Job failed");
          setLoading(false);
          clearInterval(pollInterval);
        }
      }
    }, 1000); // Poll every 1 second

    return () => {
      clearInterval(pollInterval);
    };
  }, [currentJob, usePolling, supabase]);

  const detectPlatform = (url: string): string => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
    if (url.includes("tiktok.com")) return "TikTok";
    if (url.includes("facebook.com") || url.includes("fb.watch")) return "Facebook";
    if (url.includes("instagram.com")) return "Instagram";
    if (url.includes("twitter.com") || url.includes("x.com")) return "Twitter/X";
    return "Unknown";
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      setError("Vui lòng nhập URL video");
      return;
    }

    // Show Gmail modal first
    setPendingDownload({ url, format, quality });
    setShowGmailModal(true);
  };

  const handleConfirmDownload = async (skipDrive: boolean = false) => {
    if (!pendingDownload) return;

    setShowGmailModal(false);
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

      // Reserve credits first (estimated 2 credits for video downloader)
      const reserveResponse = await fetch("/api/jobs/reserve-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolId: "video-downloader",
          estimatedCredits: 2,
        }),
      });

      const reserveData = await reserveResponse.json();

      if (!reserveResponse.ok) {
        setError(
          reserveData.error === "Insufficient credits"
            ? `Không đủ credits. Cần: ${reserveData.required}, Có: ${reserveData.available}`
            : reserveData.error || "Không thể reserve credits"
        );
        setLoading(false);
        return;
      }

      // Create job
      const idempotencyKey = `${user.id}-video-downloader-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const metadata: any = {
        url: pendingDownload.url,
        quality: pendingDownload.quality,
        format: pendingDownload.format,
        platform: detectPlatform(pendingDownload.url),
      };

      // Add Gmail if user wants Drive upload
      if (!skipDrive && userGmail.trim()) {
        metadata.user_gmail = userGmail.trim();
      }

      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .insert({
          user_id: user.id,
          tool_type: "video-downloader",
          tool_id: "video-downloader",
          status: "pending",
          idempotency_key: idempotencyKey,
          metadata,
          cost_estimate: reserveData.creditsReserved,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Set current job for real-time tracking
      setCurrentJob(job);

      // Trigger job processing
      await fetch("/api/jobs/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
    } catch (err: any) {
      console.error("Download error:", err);
      setError(err.message || "Có lỗi xảy ra khi tạo job download");
    } finally {
      setLoading(false);
      setPendingDownload(null);
      setUserGmail("");
    }
  };

  const platform = url ? detectPlatform(url) : null;

  return (
    <div className="space-y-6">
      {/* Gmail Modal */}
      {showGmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Upload lên Google Drive?</h3>

            <p className="text-gray-400 mb-4">
              Nhập Gmail của bạn để tải file lên Google Drive. File sẽ được lưu trong thư mục riêng và chỉ bạn mới xem được.
            </p>

            <input
              type="email"
              placeholder="your-email@gmail.com"
              value={userGmail}
              onChange={(e) => setUserGmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => handleConfirmDownload(false)}
                disabled={!userGmail.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-all"
              >
                Upload lên Drive
              </button>

              <button
                onClick={() => handleConfirmDownload(true)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all"
              >
                Bỏ qua
              </button>
            </div>

            <button
              onClick={() => {
                setShowGmailModal(false);
                setPendingDownload(null);
                setUserGmail("");
              }}
              className="w-full mt-3 px-4 py-2 text-gray-400 hover:text-white transition-all"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
      {/* Platform Info */}
      {platform && platform !== "Unknown" && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-blue-400">
            <Video className="h-5 w-5" />
            <span className="font-medium">Platform: {platform}</span>
          </div>
        </div>
      )}

      {/* URL Input */}
      <div>
        <label className="block text-sm font-medium mb-2">Video URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
        />
        <p className="mt-2 text-xs text-gray-400">
          Hỗ trợ: YouTube, TikTok, Facebook, Instagram, Twitter/X
        </p>
      </div>

      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Định dạng</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => {
              setFormat("mp4");
              if (quality === "audio") setQuality("highest");
            }}
            className={`p-4 rounded-lg border-2 transition-all ${
              format === "mp4"
                ? "border-blue-500 bg-blue-500/20"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <Video className="h-6 w-6 mx-auto mb-2" />
            <div className="font-medium">Video (MP4)</div>
            <div className="text-xs text-gray-400 mt-1">Tải video với âm thanh</div>
          </button>

          <button
            onClick={() => {
              setFormat("mp3");
              setQuality("audio");
            }}
            className={`p-4 rounded-lg border-2 transition-all ${
              format === "mp3"
                ? "border-blue-500 bg-blue-500/20"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <Music className="h-6 w-6 mx-auto mb-2" />
            <div className="font-medium">Audio (MP3)</div>
            <div className="text-xs text-gray-400 mt-1">Chỉ tải âm thanh</div>
          </button>
        </div>
      </div>

      {/* Quality Selection (only for video) */}
      {format === "mp4" && (
        <div>
          <label className="block text-sm font-medium mb-2">Chất lượng</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setQuality("highest")}
              className={`p-3 rounded-lg border transition-all ${
                quality === "highest"
                  ? "border-blue-500 bg-blue-500/20"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="font-medium">Cao nhất</div>
              <div className="text-xs text-gray-400">Best quality</div>
            </button>

            <button
              onClick={() => setQuality("lowest")}
              className={`p-3 rounded-lg border transition-all ${
                quality === "lowest"
                  ? "border-blue-500 bg-blue-500/20"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <div className="font-medium">Thấp nhất</div>
              <div className="text-xs text-gray-400">Smaller file</div>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-400">{error}</div>
        </div>
      )}

      {/* Job Progress */}
      {currentJob && currentJob.status !== "completed" && currentJob.status !== "failed" && (
        <div className="p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
              <div>
                <div className="font-medium text-blue-400">
                  {currentJob.status === "pending" && "Đang chờ xử lý..."}
                  {currentJob.status === "processing" && "Đang tải video..."}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {currentJob.progress_message || "Initializing..."}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400">{currentJob.progress}%</div>
              {downloadSpeed && (
                <div className="text-xs text-gray-400">{downloadSpeed}</div>
              )}
              {eta && (
                <div className="text-xs text-gray-400">ETA: {eta}</div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
              style={{ width: `${currentJob.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Message */}
      {currentJob && currentJob.status === "completed" && (
        <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-green-400">Download hoàn tất!</div>
              <div className="text-sm text-gray-400 mt-1">
                {currentJob.metadata?.video_title || "Video đã được tải xuống"}
              </div>
            </div>
          </div>

          {/* Storage info */}
          {currentJob.metadata?.storage_type && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="text-sm text-blue-400">
                {currentJob.metadata.storage_type === "supabase" && "☁️ Uploaded to Supabase Storage"}
                {currentJob.metadata.storage_type === "drive" && "☁️ Uploaded to Google Drive"}
              </div>
            </div>
          )}

          {/* Warning if upload failed */}
          {currentJob.metadata?.upload_failed && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="text-sm text-yellow-400">
                ⚠️ Upload lên cloud thất bại. File vẫn có thể tải về từ server.
              </div>
            </div>
          )}

          {/* Download Links */}
          <div className="space-y-2">
            {/* Local download (always available) */}
            <a
              href={`/api/download/${currentJob.id}`}
              download
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-medium transition-all"
            >
              <Download className="h-5 w-5" />
              Tải xuống về máy
            </a>

            {/* Google Drive links (only if user provided Gmail and upload succeeded) */}
            {currentJob.metadata?.user_gmail && !currentJob.metadata?.drive_upload_failed && currentJob.metadata?.drive_download_link && (
              <a
                href={currentJob.metadata.drive_download_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition-all"
              >
                <Download className="h-5 w-5" />
                Tải từ Google Drive
                <ExternalLink className="h-4 w-4" />
              </a>
            )}

            {currentJob.metadata?.user_gmail && !currentJob.metadata?.drive_upload_failed && currentJob.metadata?.drive_view_link && (
              <a
                href={currentJob.metadata.drive_view_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium transition-all"
              >
                <Video className="h-5 w-5" />
                Xem trên Google Drive
                <ExternalLink className="h-4 w-4" />
              </a>
            )}

            {/* Show folder link if Drive upload succeeded */}
            {currentJob.metadata?.user_gmail && currentJob.metadata?.drive_folder_link && !currentJob.metadata?.drive_upload_failed && (
              <a
                href={currentJob.metadata.drive_folder_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm text-gray-400 hover:text-white transition-all"
              >
                📁 Xem thư mục của bạn trên Drive
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Reset Button */}
          <button
            onClick={() => {
              setCurrentJob(null);
              setUrl("");
              setSuccess(false);
              setDownloadSpeed("");
              setEta("");
            }}
            className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
          >
            Tải video khác
          </button>
        </div>
      )}

      {/* Download Button */}
      {!currentJob && (
        <button
          onClick={handleDownload}
          disabled={loading || !url.trim()}
          className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-lg font-bold transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang khởi tạo...
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              Tải xuống
            </>
          )}
        </button>
      )}

      {/* Info */}
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <div className="text-sm text-yellow-400">
          <strong>Lưu ý:</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Cần cài đặt yt-dlp: <code className="bg-black/20 px-2 py-0.5 rounded">pip install yt-dlp</code></li>
            <li>Thời gian xử lý phụ thuộc vào độ dài video</li>
            <li>Video sẽ được lưu trong 7 ngày</li>
            <li>Chỉ tải video bạn có quyền sử dụng</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

