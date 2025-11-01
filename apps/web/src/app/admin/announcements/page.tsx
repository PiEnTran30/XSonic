"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, Plus, Edit, Trash2, Eye, EyeOff, Save, X } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    loadAnnouncements();
  };

  const loadAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  const startEdit = (announcement: any) => {
    setEditingId(announcement.id);
    setEditForm({ ...announcement });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    try {
      const { error } = await supabase
        .from("announcements")
        .update({
          title: editForm.title,
          message: editForm.message,
          type: editForm.type,
          is_active: editForm.is_active,
          show_once: editForm.show_once,
          priority: parseInt(editForm.priority),
          start_date: editForm.start_date || null,
          end_date: editForm.end_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) throw error;

      setMessage("Đã cập nhật thông báo!");
      setTimeout(() => setMessage(""), 3000);
      setEditingId(null);
      loadAnnouncements();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAdd = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("announcements").insert({
        title: editForm.title,
        message: editForm.message,
        type: editForm.type || "info",
        is_active: editForm.is_active ?? true,
        show_once: editForm.show_once ?? true,
        priority: parseInt(editForm.priority || "0"),
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        created_by: user?.id,
      });

      if (error) throw error;

      setMessage("Đã tạo thông báo mới!");
      setTimeout(() => setMessage(""), 3000);
      setShowAddForm(false);
      setEditForm({});
      loadAnnouncements();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa thông báo này?")) return;

    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);

      if (error) throw error;

      setMessage("Đã xóa thông báo!");
      setTimeout(() => setMessage(""), 3000);
      loadAnnouncements();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("announcements")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      loadAnnouncements();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gradient-to-b dark:from-[#0F172A] dark:to-[#1E293B] text-gray-900 dark:text-white flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gradient-to-b dark:from-[#0F172A] dark:to-[#1E293B] text-gray-900 dark:text-white">
      <header className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Về Admin
              </Link>
              <div className="flex items-center gap-3">
                <Bell className="h-6 w-6 text-blue-500" />
                <h1 className="text-2xl font-bold">Quản lý Thông báo</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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

        <div className="mb-6">
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditForm({
                title: "",
                message: "",
                type: "info",
                is_active: true,
                show_once: true,
                priority: 0,
              });
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 text-white"
          >
            <Plus className="h-5 w-5" />
            Tạo thông báo mới
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="mb-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Thông báo mới</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  value={editForm.title || ""}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  placeholder="Tiêu đề thông báo"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Nội dung
                </label>
                <textarea
                  value={editForm.message || ""}
                  onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  placeholder="Nội dung thông báo"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Loại
                  </label>
                  <select
                    value={editForm.type || "info"}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Độ ưu tiên
                  </label>
                  <input
                    type="number"
                    value={editForm.priority || 0}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_active ?? true}
                      onChange={(e) =>
                        setEditForm({ ...editForm, is_active: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Kích hoạt</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.show_once ?? true}
                      onChange={(e) =>
                        setEditForm({ ...editForm, show_once: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Hiện 1 lần</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-white"
                >
                  Tạo
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditForm({});
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors text-white"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Announcements List */}
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const isEditing = editingId === announcement.id;

            return (
              <div
                key={announcement.id}
                className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6"
              >
                {isEditing ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                    />
                    <textarea
                      value={editForm.message}
                      onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 text-white"
                      >
                        <Save className="h-4 w-4" />
                        Lưu
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 text-white"
                      >
                        <X className="h-4 w-4" />
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold">{announcement.title}</h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              announcement.type === "success"
                                ? "bg-green-500/20 text-green-400"
                                : announcement.type === "error"
                                ? "bg-red-500/20 text-red-400"
                                : announcement.type === "warning"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {announcement.type}
                          </span>
                          {announcement.is_active ? (
                            <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">
                              ✅ Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded-full">
                              ⏸️ Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                          {announcement.message}
                        </p>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                          Priority: {announcement.priority} | Show once:{" "}
                          {announcement.show_once ? "Yes" : "No"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleActive(announcement.id, announcement.is_active)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                          title={announcement.is_active ? "Deactivate" : "Activate"}
                        >
                          {announcement.is_active ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-green-400" />
                          )}
                        </button>
                        <button
                          onClick={() => startEdit(announcement)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5 text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

