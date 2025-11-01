"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FileUploader } from "@/components/upload/FileUploader";
import { ToolParameters } from "@/components/tools/ToolParameters";
import { OnlineRecorder } from "@/components/tools/OnlineRecorder";
import { VideoDownloader } from "@/components/tools/VideoDownloader";
import { CutJoin } from "@/components/tools/CutJoin";
import { PitchTempo } from "@/components/tools/PitchTempo";
import { VolumeNormalize } from "@/components/tools/VolumeNormalize";
import { AudioEnhance } from "@/components/tools/AudioEnhance";
import { StemSplitter } from "@/components/tools/StemSplitter";
import { DeReverb } from "@/components/tools/DeReverb";
import { AutoSubtitle } from "@/components/tools/AutoSubtitle";
import { Music, Sparkles, Video, Scissors, Volume2, Mic, ArrowLeft, Zap, X } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslation } from "@/hooks/useTranslation";

type ToolCategory = "ai-audio" | "audio-basic" | "video";
type Tool = {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: ToolCategory;
  acceptedTypes: string[];
  maxSizeMB: number;
};

const tools: Tool[] = [
  // AI Audio Tools
  {
    id: "stem-splitter",
    name: "Stem Splitter (Vocal Remover)",
    description: "Separate vocals, drums, bass, and other instruments",
    icon: Sparkles,
    category: "ai-audio",
    acceptedTypes: ["audio/*"],
    maxSizeMB: 200,
  },
  {
    id: "audio-enhance",
    name: "Audio Enhance",
    description: "Denoise, de-reverb, EQ, and clarity enhancement in one click",
    icon: Sparkles,
    category: "ai-audio",
    acceptedTypes: ["audio/*"],
    maxSizeMB: 200,
  },
  {
    id: "de-reverb",
    name: "De-Reverb",
    description: "Remove reverb and echo from audio",
    icon: Sparkles,
    category: "ai-audio",
    acceptedTypes: ["audio/*"],
    maxSizeMB: 200,
  },
  {
    id: "auto-subtitle",
    name: "Auto Subtitle (ASR)",
    description: "Generate subtitles automatically with speech recognition",
    icon: Sparkles,
    category: "ai-audio",
    acceptedTypes: ["audio/*", "video/*"],
    maxSizeMB: 500,
  },
  {
    id: "text-to-speech",
    name: "Text-to-Speech",
    description: "Convert text to natural-sounding speech",
    icon: Mic,
    category: "ai-audio",
    acceptedTypes: ["text/plain"],
    maxSizeMB: 1,
  },
  
  // Audio Basic Tools
  {
    id: "cut-join",
    name: "Cut & Join",
    description: "Cut, trim, and join audio files",
    icon: Scissors,
    category: "audio-basic",
    acceptedTypes: ["audio/*"],
    maxSizeMB: 200,
  },
  {
    id: "pitch-tempo",
    name: "Pitch & Tempo",
    description: "Change pitch and tempo without affecting quality",
    icon: Music,
    category: "audio-basic",
    acceptedTypes: ["audio/*"],
    maxSizeMB: 200,
  },
  {
    id: "volume-normalize",
    name: "Volume & Normalize",
    description: "Adjust volume and normalize audio levels",
    icon: Volume2,
    category: "audio-basic",
    acceptedTypes: ["audio/*"],
    maxSizeMB: 200,
  },
  {
    id: "online-recorder",
    name: "Online Recorder",
    description: "Record audio directly from your microphone",
    icon: Mic,
    category: "audio-basic",
    acceptedTypes: [],
    maxSizeMB: 0,
  },

  // Video Tools
  {
    id: "video-downloader",
    name: "Universal Video Downloader",
    description: "Download videos from TikTok, YouTube, Facebook, Instagram",
    icon: Video,
    category: "video",
    acceptedTypes: [],
    maxSizeMB: 0,
  },
  {
    id: "video-editor",
    name: "Basic Video Editor",
    description: "Cut, concat, add BGM, and overlay text",
    icon: Video,
    category: "video",
    acceptedTypes: ["video/*"],
    maxSizeMB: 500,
  },
];

export default function ToolsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const supabase = createClient();
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | "all">("all");
  const [toolParameters, setToolParameters] = useState<any>({});
  const [toolStatus, setToolStatus] = useState<Record<string, { enabled: boolean; coming_soon: boolean }>>({});
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check auth and fetch tool status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    const fetchToolStatus = async () => {
      try {
        const response = await fetch("/api/tools/status");
        const data = await response.json();
        if (data.success) {
          setToolStatus(data.tools);
        }
      } catch (error) {
        console.error("Error fetching tool status:", error);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    checkAuth();
    fetchToolStatus();
  }, [supabase]);

  const filteredTools = selectedCategory === "all"
    ? tools
    : tools.filter(t => t.category === selectedCategory);

  const handleUploadComplete = (jobId: string, fileUrl: string) => {
    console.log("Upload complete:", { jobId, fileUrl});
    // Redirect to job status page
    router.push(`/jobs/${jobId}`);
  };

  const handleParametersChange = (params: any) => {
    setToolParameters(params);
  };

  const isToolEnabled = (toolId: string) => {
    // Strict: only enable when backend explicitly marks enabled=true
    return toolStatus[toolId]?.enabled === true;
  };

  const isToolComingSoon = (toolId: string) => {
    // Coming soon when backend says so; otherwise treat as not coming soon, but combined with isToolEnabled keeps it off
    return toolStatus[toolId]?.coming_soon === true;
  };

  const handleToolClick = (tool: Tool) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setSelectedTool(tool);
  };

  // Login Modal
  const LoginModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 border border-white/20 rounded-xl p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Yêu cầu đăng nhập</h2>
          <button
            onClick={() => setShowLoginModal(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <p className="text-gray-300 mb-6">
          Bạn cần đăng nhập để sử dụng công cụ X-Sonic. Vui lòng đăng nhập để tiếp tục.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => {
              router.push("/login");
            }}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            Đăng nhập
          </button>

          <button
            onClick={() => setShowLoginModal(false)}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-medium transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      {/* Login Modal */}
      {showLoginModal && <LoginModal />}

      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                🎵 {t("tools")}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/dashboard" className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                {t("backToDashboard")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold mb-3">{t("tools")}</h2>
          <p className="text-gray-400 text-lg">10 {t("tools")} AI & Audio/Video</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Tool Selection */}
          {!selectedTool && (
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {/* Category Filter */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-400" />
                    Categories
                  </h2>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all font-medium ${
                        selectedCategory === "all"
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg"
                          : "hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>All</span>
                        <span className="text-sm opacity-75">{tools.length}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedCategory("ai-audio")}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all font-medium ${
                        selectedCategory === "ai-audio"
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg"
                          : "hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>✨ {t("aiAudioTools")}</span>
                        <span className="text-sm opacity-75">5</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedCategory("audio-basic")}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all font-medium ${
                        selectedCategory === "audio-basic"
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg"
                          : "hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>🎵 {t("basicAudioTools")}</span>
                        <span className="text-sm opacity-75">3</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setSelectedCategory("video")}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-all font-medium ${
                        selectedCategory === "video"
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg"
                          : "hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>🎬 {t("videoTools")}</span>
                        <span className="text-sm opacity-75">2</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className={selectedTool ? "lg:col-span-4" : "lg:col-span-3"}>
            <div className="space-y-6">
            {/* Tool Grid */}
            {!selectedTool && (
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-1">
                      {selectedCategory === "all" && "Tất cả công cụ"}
                      {selectedCategory === "ai-audio" && "✨ AI Audio Tools"}
                      {selectedCategory === "audio-basic" && "🎵 Basic Audio Tools"}
                      {selectedCategory === "video" && "🎬 Video Tools"}
                    </h3>
                    <p className="text-gray-400 text-sm">{filteredTools.length} công cụ khả dụng</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredTools.map((tool) => {
                    const Icon = tool.icon;
                    const categoryColors = {
                      "ai-audio": "from-blue-500/20 to-purple-500/20 border-blue-500/30 hover:border-blue-500",
                      "audio-basic": "from-green-500/20 to-teal-500/20 border-green-500/30 hover:border-green-500",
                      "video": "from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:border-purple-500",
                    };
                    const comingSoon = isToolComingSoon(tool.id);
                    const enabled = isToolEnabled(tool.id);
                    const isDisabled = isLoadingStatus || !enabled || comingSoon;

                    return (
                      <button
                        key={tool.id}
                        onClick={() => !isDisabled && handleToolClick(tool)}
                        disabled={isDisabled}
                        className={`relative p-6 bg-gradient-to-br ${categoryColors[tool.category]} rounded-xl border transition-all text-left group ${
                          !isDisabled ? "hover:scale-105 hover:shadow-xl cursor-pointer" : "opacity-60 cursor-not-allowed"
                        }`}
                      >
                        {/* Coming Soon Badge */}
                        {comingSoon && (
                          <div className="absolute top-3 right-3 px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-xs font-bold text-yellow-400">
                            Coming Soon
                          </div>
                        )}

                        {/* Disabled Badge */}
                        {!enabled && !comingSoon && (
                          <div className="absolute top-3 right-3 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full text-xs font-bold text-red-400">
                            Disabled
                          </div>
                        )}

                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-white/10 rounded-lg group-hover:scale-110 transition-transform">
                            <Icon className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        <h3 className="text-lg font-bold mb-2 group-hover:text-blue-300 transition-colors">
                          {tool.name}
                        </h3>
                        <p className="text-sm text-gray-300 mb-4">{tool.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Zap className="h-3 w-3" />
                          <span>{tool.maxSizeMB > 0 ? `Max ${tool.maxSizeMB}MB` : "No file needed"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload Area */}
            {selectedTool && (
              <div className="space-y-6">
                {/* Back Button */}
                <button
                  onClick={() => setSelectedTool(null)}
                  className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Tools</span>
                </button>

                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 bg-blue-500/20 rounded-xl">
                      {(() => {
                        const Icon = selectedTool.icon;
                        return <Icon className="h-10 w-10 text-blue-400" />;
                      })()}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-1">{selectedTool.name}</h2>
                      <p className="text-gray-400">{selectedTool.description}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg border border-white/10 p-6">
                  {selectedTool.id === "online-recorder" ? (
                    <OnlineRecorder onUploadComplete={handleUploadComplete} />
                  ) : selectedTool.id === "video-downloader" ? (
                    <VideoDownloader onUploadComplete={handleUploadComplete} />
                  ) : selectedTool.id === "cut-join" ? (
                    <CutJoin onUploadComplete={handleUploadComplete} />
                  ) : selectedTool.id === "pitch-tempo" ? (
                    <PitchTempo onUploadComplete={handleUploadComplete} />
                  ) : selectedTool.id === "volume-normalize" ? (
                    <VolumeNormalize onUploadComplete={handleUploadComplete} />
                  ) : selectedTool.id === "audio-enhance" ? (
                    <AudioEnhance onUploadComplete={handleUploadComplete} />
                  ) : selectedTool.id === "stem-splitter" ? (
                    <StemSplitter onUploadComplete={handleUploadComplete} />
                  ) : selectedTool.id === "de-reverb" ? (
                    <DeReverb onUploadComplete={handleUploadComplete} />
                  ) : selectedTool.id === "auto-subtitle" ? (
                    <AutoSubtitle onUploadComplete={handleUploadComplete} />
                  ) : selectedTool.id === "text-to-speech" ? (
                    <div className="space-y-4">
                      <textarea
                        placeholder="Enter text to convert to speech..."
                        rows={6}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <select className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500">
                          <option>Voice: English (US) - Female</option>
                          <option>Voice: English (US) - Male</option>
                          <option>Voice: English (UK) - Female</option>
                        </select>
                        <select className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500">
                          <option>Speed: Normal</option>
                          <option>Speed: Slow</option>
                          <option>Speed: Fast</option>
                        </select>
                      </div>
                      <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
                        Generate Speech
                      </button>
                    </div>
                  ) : (
                    <FileUploader
                      onUploadComplete={handleUploadComplete}
                      maxSizeMB={selectedTool.maxSizeMB}
                      acceptedTypes={selectedTool.acceptedTypes}
                      toolId={selectedTool.id}
                      parameters={toolParameters}
                    />
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

