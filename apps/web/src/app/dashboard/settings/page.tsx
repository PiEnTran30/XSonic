"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Mail, Save, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      router.push("/login");
      return;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    setUser(authUser);
    setEmail(authUser.email || "");
    setFullName(userData?.metadata?.full_name || "");
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      // Update user metadata
      const { error: updateError } = await supabase
        .from("users")
        .update({
          metadata: {
            full_name: fullName,
          },
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setMessage("Đã lưu thay đổi thành công!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            <div className="h-6 w-px bg-white/20"></div>
            <h1 className="text-2xl font-bold">Cài đặt</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <User className="h-5 w-5" />
              Thông tin cá nhân
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Họ và tên</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Email không thể thay đổi
                </p>
              </div>
            </div>
          </div>

          {/* Account Section */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-6">Tài khoản</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <div className="font-medium">User ID</div>
                  <div className="text-sm text-gray-400">{user?.id}</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <div className="font-medium">Ngày tạo</div>
                  <div className="text-sm text-gray-400">
                    {new Date(user?.created_at).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400">
              {message}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Lưu thay đổi
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}

