"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Upload, History, Wallet, Settings, Music, Video, Sparkles,
  Scissors, Volume2, Download, LogOut, Zap, Crown, TrendingUp,
  CheckCircle, Clock, AlertCircle, XCircle, Loader2, Trash2, CreditCard, Receipt
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslation } from "@/hooks/useTranslation";
import { createClient } from "@/lib/supabase/client";

interface DashboardClientProps {
  user: any;
  userData: any;
  credits: number;
  isAdmin: boolean;
  jobsCount: number;
}

export function DashboardClient({ user, userData, credits, isAdmin, jobsCount }: DashboardClientProps) {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchRecentJobs();
  }, []);

  const fetchRecentJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleDeleteJob = async (e: React.MouseEvent, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this job?")) {
      return;
    }

    setDeletingJobId(jobId);
    try {
      const response = await fetch("/api/jobs/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete job");
      }

      // Remove job from list
      setJobs(jobs.filter(j => j.id !== jobId));
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete job");
    } finally {
      setDeletingJobId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-400" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "processing":
        return "text-blue-400";
      case "pending":
        return "text-yellow-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                X-Sonic
              </Link>
              <nav className="hidden md:flex items-center gap-4">
                <Link href="/tools" className="text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
                  🎵 {t("tools")}
                </Link>
                <Link href="/dashboard" className="text-white bg-blue-500/20 px-3 py-2 rounded-lg">
                  📊 {t("dashboard")}
                </Link>
                <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
                  💎 {t("pricing")}
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="text-orange-400 hover:text-orange-300 bg-orange-500/20 px-3 py-2 rounded-lg hover:bg-orange-500/30 transition-all">
                    🛡️ {t("admin")}
                  </Link>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-2 rounded-lg border border-yellow-500/30">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="font-bold text-yellow-400">{credits}</span>
                <span className="text-sm text-gray-400">{t("credits")}</span>
              </div>
              <div className="text-sm text-gray-400 hidden md:block">{user.email}</div>
              <ThemeToggle />
              <form action="/api/auth/signout" method="post">
                <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("logout")}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {t("welcome")}, {userData?.metadata?.full_name || user.email?.split("@")[0]}! 👋
          </h1>
          <p className="text-gray-400">X-Sonic AI Studio</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/pricing" className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-6 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-400" />
              </div>
              <Crown className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold mb-1">{credits}</div>
            <p className="text-sm text-gray-400">{t("credits")}</p>
          </Link>

          <Link href="/dashboard/jobs" className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-6 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <History className="h-6 w-6 text-purple-400" />
              </div>
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold mb-1">{jobsCount}</div>
            <p className="text-sm text-gray-400">Jobs</p>
          </Link>

          <Link href="/tools" className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl p-6 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Upload className="h-6 w-6 text-orange-400" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">Upload</div>
            <p className="text-sm text-gray-400">New Job</p>
          </Link>
        </div>

        {/* Main Tools Section */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* AI Audio Tools */}
          <Link href="/tools?category=ai-audio" className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-xl p-6 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Sparkles className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">{t("aiAudioTools")}</h3>
                <p className="text-sm text-gray-400">5 {t("tools")}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                <span>{t("stemSplitter")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span>{t("audioEnhance")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>{t("deReverb")}</span>
              </div>
            </div>
          </Link>

          {/* Basic Audio Tools */}
          <Link href="/tools?category=audio-basic" className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/50 rounded-xl p-6 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Scissors className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">{t("basicAudioTools")}</h3>
                <p className="text-sm text-gray-400">4 {t("tools")}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                <span>{t("cutJoin")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                <span>{t("pitchTempo")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span>{t("volumeNormalize")}</span>
              </div>
            </div>
          </Link>

          {/* Video Tools */}
          <Link href="/tools?category=video" className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-xl p-6 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Video className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">{t("videoTools")}</h3>
                <p className="text-sm text-gray-400">2 {t("tools")}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span>{t("videoDownloader")}</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Upload Section */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-8 mb-8 text-center">
          <Upload className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t("uploadFiles")}</h2>
          <p className="text-gray-400 mb-6">X-Sonic AI Studio</p>
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-bold text-lg transition-all transform hover:scale-105"
          >
            <Upload className="h-5 w-5" />
            {t("upload")}
          </Link>
        </div>

        {/* Recent Jobs */}
        <div id="recent-jobs" className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <History className="h-5 w-5" />
              {t("viewHistory")}
            </h2>
            {jobs.length > 0 && (
              <Link href="/dashboard/jobs" className="text-sm text-blue-400 hover:text-blue-300">
                View all →
              </Link>
            )}
          </div>

          {loadingJobs ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-400" />
              <p className="text-gray-400">Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No jobs yet</p>
              <Link href="/tools" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
                Start using tools →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all group"
                >
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex items-center gap-4 flex-1"
                  >
                    <div className="flex-shrink-0">
                      {getStatusIcon(job.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{job.tool_id}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(job.created_at).toLocaleDateString()} {new Date(job.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className={`text-sm font-medium ${getStatusColor(job.status)}`}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </div>
                    <button
                      onClick={(e) => handleDeleteJob(e, job.id)}
                      disabled={deletingJobId === job.id}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete job"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

