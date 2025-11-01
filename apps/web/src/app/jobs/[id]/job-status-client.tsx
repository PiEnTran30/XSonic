"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Loader2,
  FileAudio,
  FileVideo,
  Trash2,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface Job {
  id: string;
  user_id: string;
  tool_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  input_file_path: string;
  input_file_url: string;
  output_file_path?: string;
  output_file_url?: string;
  error_message?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

interface JobStatusClientProps {
  job: Job;
}

export function JobStatusClient({ job: initialJob }: JobStatusClientProps) {
  const { t } = useTranslation();
  const [job, setJob] = useState<Job>(initialJob);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Subscribe to job updates
    const channel = supabase
      .channel(`job:${job.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${job.id}`,
        },
        (payload) => {
          setJob(payload.new as Job);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [job.id]);

  const getStatusIcon = () => {
    switch (job.status) {
      case "pending":
        return <Clock className="h-12 w-12 text-yellow-400" />;
      case "processing":
        return <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-12 w-12 text-green-400" />;
      case "failed":
        return <AlertCircle className="h-12 w-12 text-red-400" />;
      default:
        return <Clock className="h-12 w-12 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case "pending":
        return "Đang chờ xử lý...";
      case "processing":
        return "Đang xử lý...";
      case "completed":
        return "Hoàn thành!";
      case "failed":
        return "Thất bại";
      default:
        return "Unknown";
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case "pending":
        return "text-yellow-400";
      case "processing":
        return "text-blue-400";
      case "completed":
        return "text-green-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  const getFileIcon = () => {
    if (job.tool_id.includes("video")) {
      return <FileVideo className="h-6 w-6 text-purple-400" />;
    }
    return <FileAudio className="h-6 w-6 text-blue-400" />;
  };

  const handleDeleteJob = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa job này? Hành động này không thể hoàn tác.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/jobs/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete job");
      }

      // Redirect to dashboard after successful deletion
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Không thể xóa job. Vui lòng thử lại.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            {t("backToDashboard")}
          </Link>
          <button
            onClick={handleDeleteJob}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete job"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-sm font-medium">Xóa Job</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Status Card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 mb-6">
          <div className="flex flex-col items-center text-center mb-6">
            {getStatusIcon()}
            <h1 className={`text-3xl font-bold mt-4 ${getStatusColor()}`}>
              {getStatusText()}
            </h1>
            <p className="text-gray-400 mt-2">Job ID: {job.id}</p>
          </div>

          {/* Progress Bar */}
          {(job.status === "pending" || job.status === "processing") && (
            <div className="mb-6">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    job.status === "pending"
                      ? "w-1/4 bg-yellow-500"
                      : "w-3/4 bg-blue-500 animate-pulse"
                  }`}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {job.status === "failed" && job.error_message && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{job.error_message}</p>
            </div>
          )}

          {/* Download Button */}
          {job.status === "completed" && job.output_file_url && (
            <div className="flex justify-center">
              <a
                href={job.output_file_url}
                download
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg font-bold text-lg transition-all transform hover:scale-105"
              >
                <Download className="h-5 w-5" />
                {t("download")} Result
              </a>
            </div>
          )}
        </div>

        {/* Job Details */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Chi tiết Job</h2>
          
          <div className="space-y-4">
            {/* Tool */}
            <div className="flex items-start gap-3">
              <div className="text-gray-400 w-32 flex-shrink-0">Tool:</div>
              <div className="font-medium">{job.tool_id}</div>
            </div>

            {/* Input File */}
            <div className="flex items-start gap-3">
              <div className="text-gray-400 w-32 flex-shrink-0">Input File:</div>
              <div className="flex items-center gap-2">
                {getFileIcon()}
                <span className="text-sm">
                  {job.metadata?.original_filename || "Unknown"}
                </span>
                <span className="text-xs text-gray-400">
                  ({(job.metadata?.file_size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            </div>

            {/* Created At */}
            <div className="flex items-start gap-3">
              <div className="text-gray-400 w-32 flex-shrink-0">Created:</div>
              <div className="text-sm">{formatDate(job.created_at)}</div>
            </div>

            {/* Updated At */}
            <div className="flex items-start gap-3">
              <div className="text-gray-400 w-32 flex-shrink-0">Updated:</div>
              <div className="text-sm">{formatDate(job.updated_at)}</div>
            </div>

            {/* Status */}
            <div className="flex items-start gap-3">
              <div className="text-gray-400 w-32 flex-shrink-0">Status:</div>
              <div className={`font-medium ${getStatusColor()}`}>
                {job.status.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        {job.status === "pending" && (
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              ℹ️ Job của bạn đang trong hàng đợi. Chúng tôi sẽ xử lý sớm nhất có thể.
            </p>
          </div>
        )}

        {job.status === "processing" && (
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-400 text-sm">
              ⚡ Job đang được xử lý. Vui lòng đợi...
            </p>
          </div>
        )}

        {job.status === "completed" && (
          <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 text-sm">
              ✅ Job hoàn thành! Bạn có thể tải xuống kết quả ở trên.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

