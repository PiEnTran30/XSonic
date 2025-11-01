"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Zap, Mail, Edit, Save, X, ExternalLink } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslation } from "@/hooks/useTranslation";

export default function AdminUsersPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

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

    await Promise.all([loadUsers(), loadPlans()]);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        wallets (balance_credits, reserved_credits),
        subscriptions_internal (
          status,
          plans (name, slug)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const loadPlans = async () => {
    const { data } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order");
    
    setPlans(data || []);
  };

  const startEdit = (user: any) => {
    setEditingId(user.id);
    setEditForm({
      full_name: user.metadata?.full_name || "",
      role: user.role || "user",
      credits: user.wallets?.[0]?.balance_credits || 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (userId: string) => {
    try {
      // Get current user data
      const { data: currentUser } = await supabase
        .from("users")
        .select("metadata")
        .eq("id", userId)
        .single();

      // Update user with metadata
      const { error: userError } = await supabase
        .from("users")
        .update({
          metadata: {
            ...currentUser?.metadata,
            full_name: editForm.full_name,
          },
          role: editForm.role,
        })
        .eq("id", userId);

      if (userError) throw userError;

      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          balance_credits: parseFloat(editForm.credits),
        })
        .eq("user_id", userId);

      if (walletError) throw walletError;

      setMessage("Cập nhật thành công!");
      setTimeout(() => setMessage(""), 3000);
      setEditingId(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const assignPlan = async (userId: string, planId: string) => {
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) return;

      const { data: existingSub } = await supabase
        .from("subscriptions_internal")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (existingSub) {
        await supabase
          .from("subscriptions_internal")
          .update({
            plan_id: planId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSub.id);
      } else {
        await supabase
          .from("subscriptions_internal")
          .insert({
            user_id: userId,
            plan_id: planId,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
      }

      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance_credits")
        .eq("user_id", userId)
        .single();

      await supabase
        .from("wallets")
        .update({
          balance_credits: (wallet?.balance_credits || 0) + plan.credits_monthly,
        })
        .eq("user_id", userId);

      setMessage(`Gán gói thành công (${plan.name})`);
      setTimeout(() => setMessage(""), 3000);
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.metadata?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Admin</span>
              </Link>
              <div className="h-6 w-px bg-white/20"></div>
              <h1 className="text-2xl font-bold">Quản lý Users</h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {message && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
            />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Tên</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Credits</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Gói</th>
                  <th className="px-6 py-4 text-left text-sm font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredUsers.map((user) => {
                  const isEditing = editingId === user.id;
                  const wallet = user.wallets?.[0];
                  const subscription = user.subscriptions_internal?.find((s: any) => s.status === "active");

                  return (
                    <tr key={user.id} className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded focus:outline-none focus:border-blue-500 text-white"
                          />
                        ) : (
                          <span className="text-sm">{user.metadata?.full_name || "-"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded focus:outline-none focus:border-blue-500 text-white"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs ${user.role === "admin" ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"}`}>
                            {user.role === "admin" ? "Admin" : "User"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.credits}
                            onChange={(e) => setEditForm({ ...editForm, credits: e.target.value })}
                            className="w-24 px-3 py-1.5 bg-white/5 border border-white/10 rounded focus:outline-none focus:border-blue-500 text-white"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-400" />
                            <span className="font-bold text-yellow-400">{wallet?.balance_credits || 0}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <span className="text-sm">{subscription?.plans?.name || "-"}</span>
                          <select
                            onChange={(e) => assignPlan(user.id, e.target.value)}
                            className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs focus:outline-none focus:border-blue-500 text-white"
                            defaultValue=""
                          >
                            <option value="" disabled>Gán gói</option>
                            {plans.map((plan) => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name} (+{plan.credits_monthly} credits)
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(user.id)}
                              className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded transition-colors"
                              title="Save"
                            >
                              <Save className="h-4 w-4 text-green-400" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
                              title="Cancel"
                            >
                              <X className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(user)}
                              className="p-2 hover:bg-white/10 rounded transition-colors"
                              title="Quick Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="p-2 hover:bg-blue-500/20 rounded transition-colors"
                              title="Full Edit"
                            >
                              <ExternalLink className="h-4 w-4 text-blue-400" />
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
