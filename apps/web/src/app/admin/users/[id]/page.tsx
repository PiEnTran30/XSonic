"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, CreditCard, Shield, Mail, Calendar } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  role: string;
  metadata: any;
  created_at: string;
  wallet: {
    balance_credits: number;
    reserved_credits: number;
  };
  subscription: {
    status: string;
    plan: {
      name: string;
      slug: string;
    };
  };
}

export default function AdminEditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [role, setRole] = useState("user");
  const [creditsToAdd, setCreditsToAdd] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkAdminAndLoadUser();
  }, []);

  const checkAdminAndLoadUser = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      router.push("/login");
      return;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (userData?.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    loadUser();
  };

  const loadUser = async () => {
    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        wallet:wallets(balance_credits, reserved_credits),
        subscription:subscriptions_internal(
          status,
          plan:plans(name, slug)
        )
      `)
      .eq("id", userId)
      .single();

    if (error) {
      setError(error.message);
    } else {
      setUser(data);
      setRole(data.role);
    }
    setLoading(false);
  };

  const handleSaveRole = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase
        .from("users")
        .update({ role })
        .eq("id", userId);

      if (error) throw error;

      setMessage("Đã cập nhật role thành công!");
      setTimeout(() => setMessage(""), 3000);
      loadUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCredits = async () => {
    if (!creditsToAdd || parseFloat(creditsToAdd) <= 0) {
      setError("Vui lòng nhập số credits hợp lệ");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      // Add credits to wallet
      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          balance_credits: (user?.wallet?.balance_credits || 0) + parseFloat(creditsToAdd)
        })
        .eq("user_id", userId);

      if (walletError) throw walletError;

      // Log transaction
      await supabase
        .from("wallet_transactions")
        .insert({
          user_id: userId,
          type: "credit",
          amount: parseFloat(creditsToAdd),
          balance_after: (user?.wallet?.balance_credits || 0) + parseFloat(creditsToAdd),
          reason: `Admin added credits`,
          metadata: { admin_action: true }
        });

      setMessage(`Đã thêm ${creditsToAdd} credits thành công!`);
      setCreditsToAdd("");
      setTimeout(() => setMessage(""), 3000);
      loadUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePlan = async (planSlug: string) => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      // Get plan ID
      const { data: plan } = await supabase
        .from("plans")
        .select("id")
        .eq("slug", planSlug)
        .single();

      if (!plan) throw new Error("Plan not found");

      // Delete old subscription
      await supabase
        .from("subscriptions_internal")
        .delete()
        .eq("user_id", userId);

      // Create new subscription
      const { error } = await supabase
        .from("subscriptions_internal")
        .insert({
          user_id: userId,
          plan_id: plan.id,
          status: "active",
          billing_cycle: "monthly",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (error) throw error;

      setMessage(`Đã chuyển sang plan ${planSlug} thành công!`);
      setTimeout(() => setMessage(""), 3000);
      loadUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white flex items-center justify-center">
        <div className="text-xl text-red-400">User not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      <header className="border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Edit User</h1>

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

        {/* User Info */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            User Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400">Email</label>
              <div className="text-lg font-mono">{user.email}</div>
            </div>
            <div>
              <label className="text-sm text-gray-400">User ID</label>
              <div className="text-sm font-mono text-gray-500">{user.id}</div>
            </div>
            <div>
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created At
              </label>
              <div className="text-sm">{new Date(user.created_at).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Role Management */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Management
          </h2>
          <div className="flex items-center gap-4">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={handleSaveRole}
              disabled={saving || role === user.role}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Role
            </button>
          </div>
        </div>

        {/* Credits Management */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credits Management
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="text-sm text-gray-400">Balance Credits</div>
                <div className="text-2xl font-bold text-green-400">
                  {user.wallet?.balance_credits || 0}
                </div>
              </div>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="text-sm text-gray-400">Reserved Credits</div>
                <div className="text-2xl font-bold text-yellow-400">
                  {user.wallet?.reserved_credits || 0}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={creditsToAdd}
                onChange={(e) => setCreditsToAdd(e.target.value)}
                placeholder="Enter credits to add"
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAddCredits}
                disabled={saving || !creditsToAdd}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                Add Credits
              </button>
            </div>
          </div>
        </div>

        {/* Plan Management */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Plan Management</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="text-sm text-gray-400">Current Plan</div>
              <div className="text-xl font-bold text-blue-400">
                {user.subscription?.plan?.name || "No Plan"}
              </div>
              <div className="text-sm text-gray-500">
                Status: {user.subscription?.status || "N/A"}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {["free", "starter", "pro", "enterprise"].map((planSlug) => (
                <button
                  key={planSlug}
                  onClick={() => handleChangePlan(planSlug)}
                  disabled={saving || user.subscription?.plan?.slug === planSlug}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 hover:border-blue-500/50 rounded-lg font-medium transition-all capitalize"
                >
                  {planSlug}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

