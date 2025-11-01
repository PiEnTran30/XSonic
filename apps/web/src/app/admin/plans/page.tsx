"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Zap, Crown, Rocket, Building2, Save, X } from "lucide-react";

export default function AdminPlansPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
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

    loadPlans();
  };

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order");

    if (error) {
      setError(error.message);
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  };

  const startEdit = (plan: any) => {
    setEditingId(plan.id);
    setEditForm({ ...plan });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (planId: string) => {
    try {
      const { error } = await supabase
        .from("plans")
        .update({
          name: editForm.name,
          price_monthly: parseFloat(editForm.price_monthly),
          price_yearly: parseFloat(editForm.price_yearly),
          credits_monthly: parseInt(editForm.credits_monthly),
          is_visible: editForm.is_visible,
        })
        .eq("id", planId);

      if (error) throw error;

      setMessage("Đã cập nhật gói thành công!");
      setTimeout(() => setMessage(""), 3000);
      setEditingId(null);
      loadPlans();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const planIcons: any = {
    free: Zap,
    starter: Rocket,
    pro: Crown,
    enterprise: Building2,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Admin</span>
              </Link>
              <div className="h-6 w-px bg-white/20"></div>
              <h1 className="text-2xl font-bold">Quản lý Plans</h1>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-medium transition-all">
              <Plus className="h-4 w-4" />
              Tạo Plan mới
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {message && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {plans?.map((plan: any) => {
            const Icon = planIcons[plan.slug] || Zap;
            const isEditing = editingId === plan.id;

            return (
              <div
                key={plan.id}
                className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <Icon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="text-2xl font-bold bg-white/5 border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                        />
                      ) : (
                        <h3 className="text-2xl font-bold">{plan.name}</h3>
                      )}
                      <div className="text-sm text-gray-400">{plan.slug}</div>
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(plan.id)}
                        className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                      >
                        <Save className="h-5 w-5 text-green-400" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                      >
                        <X className="h-5 w-5 text-red-400" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(plan)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <p className="text-gray-400 mb-6">{plan.description}</p>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Tháng</div>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.price_monthly}
                        onChange={(e) => setEditForm({ ...editForm, price_monthly: e.target.value })}
                        className="text-2xl font-bold bg-white/5 border border-white/10 rounded px-2 py-1 w-full focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <div className="text-2xl font-bold">{plan.price_monthly.toLocaleString('vi-VN')} ₫</div>
                    )}
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Năm</div>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.price_yearly}
                        onChange={(e) => setEditForm({ ...editForm, price_yearly: e.target.value })}
                        className="text-2xl font-bold bg-white/5 border border-white/10 rounded px-2 py-1 w-full focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <div className="text-2xl font-bold">{plan.price_yearly.toLocaleString('vi-VN')} ₫</div>
                    )}
                  </div>
                </div>

                {/* Credits & Limits */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-sm text-gray-400">Credits/tháng</span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.credits_monthly}
                        onChange={(e) => setEditForm({ ...editForm, credits_monthly: e.target.value })}
                        className="font-bold bg-white/5 border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <span className="font-bold">{plan.credits_monthly.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-sm text-gray-400">Max file size</span>
                    <span className="font-bold">{plan.limits.max_file_size_mb}MB</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-sm text-gray-400">Max storage</span>
                    <span className="font-bold">{plan.limits.max_storage_gb}GB</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-sm text-gray-400">Concurrent jobs</span>
                    <span className="font-bold">{plan.limits.max_concurrent_jobs}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold mb-2">Features:</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(plan.features).map(([key, value]) => (
                      <div
                        key={key}
                        className={`px-3 py-2 rounded-lg ${
                          value ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {value ? "✓" : "✗"} {key.replace(/_/g, " ")}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Hiển thị:</span>
                    {isEditing ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.is_visible}
                          onChange={(e) => setEditForm({ ...editForm, is_visible: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{editForm.is_visible ? "Có" : "Không"}</span>
                      </label>
                    ) : (
                      <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                          plan.is_visible
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {plan.is_visible ? "Có" : "Không"}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    Thứ tự: {plan.sort_order}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

