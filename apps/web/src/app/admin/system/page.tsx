"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, Save, AlertTriangle, Power, Settings as SettingsIcon, Users, FileUp, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslation } from "@/hooks/useTranslation";

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string;
  updated_at: string;
}

export default function AdminSystemPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Form states
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [toolsEnabled, setToolsEnabled] = useState<Record<string, { enabled: boolean; coming_soon: boolean }>>({});
  const [initialCredits, setInitialCredits] = useState(100);

  // Google integration states
  const [googleAiApiKey, setGoogleAiApiKey] = useState("");
  const [googleDriveCredentials, setGoogleDriveCredentials] = useState("");
  const [googleDriveFolderId, setGoogleDriveFolderId] = useState("");

  useEffect(() => {
    checkAdminAndLoadSettings();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('system_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings'
        },
        (payload) => {
          console.log('Settings changed:', payload);
          loadSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAdminAndLoadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    loadSettings();
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from("system_settings")
      .select("*")
      .order("key");

    if (error) {
      setError(error.message);
    } else {
      setSettings(data || []);
      
      // Parse settings
      data?.forEach((setting) => {
        if (setting.key === "maintenance_mode") {
          setMaintenanceEnabled(setting.value.enabled);
          setMaintenanceMessage(setting.value.message);
        } else if (setting.key === "registration_enabled") {
          setRegistrationEnabled(setting.value.enabled);
        } else if (setting.key === "tools_enabled") {
          setToolsEnabled(setting.value);
        } else if (setting.key === "initial_credits") {
          setInitialCredits(parseInt(setting.value) || 100);
        } else if (setting.key === "google_ai_api_key") {
          setGoogleAiApiKey(setting.value);
        } else if (setting.key === "google_drive_credentials") {
          setGoogleDriveCredentials(setting.value);
        } else if (setting.key === "google_drive_folder_id") {
          setGoogleDriveFolderId(setting.value);
        }
      });
    }
    setLoading(false);
  };

  const updateSetting = async (key: string, value: any) => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("system_settings")
        .update({ 
          value,
          updated_by: user?.id 
        })
        .eq("key", key);

      if (error) throw error;

      setMessage(`Đã cập nhật ${key} thành công!`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMaintenanceToggle = async () => {
    const newValue = !maintenanceEnabled;
    setMaintenanceEnabled(newValue);
    await updateSetting("maintenance_mode", {
      enabled: newValue,
      message: maintenanceMessage
    });

    // Revalidate cache
    try {
      await fetch('/api/revalidate', { method: 'POST' });
    } catch (e) {
      console.error('Revalidate error:', e);
    }

    // Force hard reload to clear all caches
    setTimeout(() => {
      window.location.href = window.location.href;
    }, 500);
  };

  const handleMaintenanceMessageSave = async () => {
    await updateSetting("maintenance_mode", {
      enabled: maintenanceEnabled,
      message: maintenanceMessage
    });
  };

  const handleRegistrationToggle = async () => {
    const newValue = !registrationEnabled;
    setRegistrationEnabled(newValue);
    await updateSetting("registration_enabled", {
      enabled: newValue
    });
  };

  const handleToolToggle = async (toolId: string, field: 'enabled' | 'coming_soon') => {
    const currentTool = toolsEnabled[toolId] || { enabled: false, coming_soon: false };
    const newToolsEnabled = {
      ...toolsEnabled,
      [toolId]: {
        ...currentTool,
        [field]: !currentTool[field]
      }
    };
    setToolsEnabled(newToolsEnabled);
    await updateSetting("tools_enabled", newToolsEnabled);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const tools = [
    { id: "stem-splitter", name: "Stem Splitter", category: "AI Audio" },
    { id: "audio-enhance", name: "Audio Enhance", category: "AI Audio" },
    { id: "de-reverb", name: "De-Reverb", category: "AI Audio" },
    { id: "auto-subtitle", name: "Auto Subtitle", category: "AI Audio" },
    { id: "text-to-speech", name: "Text-to-Speech", category: "AI Audio" },
    { id: "cut-join", name: "Cut & Join", category: "Basic Audio" },
    { id: "pitch-tempo", name: "Pitch & Tempo", category: "Basic Audio" },
    { id: "volume-normalize", name: "Volume & Normalize", category: "Basic Audio" },
    { id: "online-recorder", name: "Online Recorder", category: "Basic Audio" },
    { id: "video-downloader", name: "Video Downloader", category: "Video" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#0F172A] dark:to-[#1E293B] text-gray-900 dark:text-white">
      <header className="border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-transparent backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToAdmin")}
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
          <h1 className="text-3xl font-bold">System Settings</h1>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-500/20 border border-green-300 dark:border-green-500/30 rounded-lg text-green-700 dark:text-green-400">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Maintenance Mode */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Chế độ bảo trì</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tắt toàn bộ hệ thống để bảo trì</p>
                </div>
              </div>
              <button
                onClick={handleMaintenanceToggle}
                disabled={saving}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  maintenanceEnabled ? "bg-red-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    maintenanceEnabled ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {maintenanceEnabled && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400 font-bold mb-2">⚠️ Chế độ bảo trì đang BẬT</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Users sẽ không thể truy cập hệ thống</p>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Thông báo bảo trì</label>
              <textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                placeholder="Nhập thông báo hiển thị khi bảo trì..."
              />
              <button
                onClick={handleMaintenanceMessageSave}
                disabled={saving}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 rounded-lg font-medium transition-colors flex items-center gap-2 text-white"
              >
                <Save className="h-4 w-4" />
                Lưu thông báo
              </button>
            </div>
          </div>

          {/* Initial Credits */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 rounded-xl">
                <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Credits ban đầu</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Số credits khi tạo tài khoản mới</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0"
                step="10"
                value={initialCredits}
                onChange={(e) => setInitialCredits(parseInt(e.target.value) || 0)}
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
              />
              <button
                onClick={async () => {
                  await updateSetting("initial_credits", initialCredits.toString());
                }}
                disabled={saving}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 rounded-lg font-medium transition-colors flex items-center gap-2 text-white"
              >
                <Save className="h-5 w-5" />
                Lưu
              </button>
            </div>

            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              💡 User mới sẽ nhận <span className="font-bold text-yellow-600 dark:text-yellow-400">{initialCredits} credits</span> khi đăng ký
            </p>
          </div>

          {/* Registration */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Đăng ký User mới</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cho phép users đăng ký tài khoản mới</p>
                </div>
              </div>
              <button
                onClick={handleRegistrationToggle}
                disabled={saving}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  registrationEnabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    registrationEnabled ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Google Integration Settings */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-orange-100 dark:bg-orange-500/20 rounded-xl">
                <FileUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Google AI & Drive Integration</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cấu hình Google AI Studio và Google Drive</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Google AI API Key</label>
                <input
                  type="password"
                  value={googleAiApiKey}
                  onChange={(e) => setGoogleAiApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Lấy từ <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-500 hover:underline">Google AI Studio</a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Google Drive Credentials (JSON)</label>
                <textarea
                  value={googleDriveCredentials}
                  onChange={(e) => setGoogleDriveCredentials(e.target.value)}
                  placeholder='{"type": "service_account", ...}'
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Service Account JSON từ <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-500 hover:underline">Google Cloud Console</a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Google Drive Folder ID</label>
                <input
                  type="text"
                  value={googleDriveFolderId}
                  onChange={(e) => setGoogleDriveFolderId(e.target.value)}
                  placeholder="1a2b3c4d5e6f..."
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Folder ID từ URL: drive.google.com/drive/folders/<strong>[ID]</strong>
                </p>
              </div>

              <button
                onClick={async () => {
                  await updateSetting("google_ai_api_key", googleAiApiKey);
                  await updateSetting("google_drive_credentials", googleDriveCredentials);
                  await updateSetting("google_drive_folder_id", googleDriveFolderId);
                }}
                disabled={saving}
                className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="h-5 w-5" />
                {saving ? "Đang lưu..." : "Lưu cấu hình Google"}
              </button>
            </div>
          </div>

          {/* Tools Enable/Disable */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Quản lý Tools</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bật/tắt tools và đánh dấu "Coming Soon"</p>
              </div>
            </div>

            <div className="grid md:grid-cols-1 gap-4">
              {tools.map((tool) => {
                const toolStatus = toolsEnabled[tool.id] || { enabled: false, coming_soon: false };
                return (
                  <div
                    key={tool.id}
                    className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">{tool.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{tool.category}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Coming Soon Toggle */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Coming Soon</span>
                          <button
                            onClick={() => handleToolToggle(tool.id, 'coming_soon')}
                            disabled={saving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              toolStatus.coming_soon ? "bg-yellow-500" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                toolStatus.coming_soon ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex gap-2">
                      {toolStatus.coming_soon && (
                        <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full">
                          🔜 Coming Soon
                        </span>
                      )}
                      {!toolStatus.coming_soon && (
                        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                          ✅ Available
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

