import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, CreditCard, Package, Ticket, Settings, TrendingUp, DollarSign, Activity, Zap, Bell, Server } from "lucide-react";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch stats
  const { count: usersCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  const { count: jobsCount } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true });

  const { data: totalCredits } = await supabase
    .from("wallets")
    .select("balance_credits");

  const totalCreditsSum = totalCredits?.reduce((sum, w) => sum + w.balance_credits, 0) || 0;

  const { count: activeSubscriptions } = await supabase
    .from("subscriptions_internal")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                ← Dashboard
              </Link>
              <div className="h-6 w-px bg-white/20"></div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                🛡️ Admin Panel
              </h1>
            </div>
            <div className="text-sm text-gray-400">
              {user.email}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold mb-1">{usersCount || 0}</div>
            <p className="text-sm text-gray-400">Tổng Users</p>
          </div>

          <div className="p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Activity className="h-6 w-6 text-purple-400" />
              </div>
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold mb-1">{jobsCount || 0}</div>
            <p className="text-sm text-gray-400">Tổng Jobs</p>
          </div>

          <div className="p-6 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-400" />
              </div>
              <TrendingUp className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold mb-1">{totalCreditsSum.toLocaleString()}</div>
            <p className="text-sm text-gray-400">Tổng Credits</p>
          </div>

          <div className="p-6 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CreditCard className="h-6 w-6 text-green-400" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold mb-1">{activeSubscriptions || 0}</div>
            <p className="text-sm text-gray-400">Active Subscriptions</p>
          </div>
        </div>

        {/* Admin Menu */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/admin/users"
            className="group p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-xl transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-blue-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Quản lý Users</h3>
                <p className="text-sm text-gray-400">{usersCount || 0} users</p>
              </div>
            </div>
            <p className="text-gray-400">Xem, chỉnh sửa, và quản lý tất cả users</p>
          </Link>

          <Link
            href="/admin/plans"
            className="group p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-xl transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-purple-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Package className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Quản lý Plans</h3>
                <p className="text-sm text-gray-400">4 plans</p>
              </div>
            </div>
            <p className="text-gray-400">Tạo, chỉnh sửa pricing và features</p>
          </Link>

          <Link
            href="/admin/vouchers"
            className="group p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/50 rounded-xl transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-green-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Ticket className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Quản lý Vouchers</h3>
                <p className="text-sm text-gray-400">Mã giảm giá</p>
              </div>
            </div>
            <p className="text-gray-400">Tạo và quản lý vouchers</p>
          </Link>

          <Link
            href="/admin/transactions"
            className="group p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-500/50 rounded-xl transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-yellow-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <CreditCard className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Transactions</h3>
                <p className="text-sm text-gray-400">Lịch sử giao dịch</p>
              </div>
            </div>
            <p className="text-gray-400">Xem tất cả transactions</p>
          </Link>

          <Link
            href="/admin/payment-methods"
            className="group p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/50 rounded-xl transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-orange-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <CreditCard className="h-8 w-8 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Phương thức thanh toán</h3>
                <p className="text-sm text-gray-400">STK, QR, Ngân hàng</p>
              </div>
            </div>
            <p className="text-gray-400">Quản lý STK, QR code, thông tin ngân hàng</p>
          </Link>

          <Link
            href="/admin/jobs"
            className="group p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/50 rounded-xl transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-orange-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Activity className="h-8 w-8 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Quản lý Jobs</h3>
                <p className="text-sm text-gray-400">{jobsCount || 0} jobs</p>
              </div>
            </div>
            <p className="text-gray-400">Monitor và quản lý tất cả jobs</p>
          </Link>

          <Link
            href="/admin/tool-costs"
            className="group p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-500/50 rounded-xl transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-yellow-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Giá Credits</h3>
                <p className="text-sm text-gray-400">Tool pricing</p>
              </div>
            </div>
            <p className="text-gray-400">Quản lý giá credits cho từng tool</p>
          </Link>

          <Link
            href="/admin/system"
            className="group p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/50 rounded-xl transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-red-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Settings className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">System Settings</h3>
                <p className="text-sm text-gray-400">Bảo trì & Tools</p>
              </div>
            </div>
            <p className="text-gray-400">Bảo trì, bật/tắt tools, realtime</p>
          </Link>

          <Link
            href="/admin/announcements"
            className="group p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-xl transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-blue-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Bell className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Quản lý Thông báo</h3>
                <p className="text-sm text-gray-400">Announcements</p>
              </div>
            </div>
            <p className="text-gray-400">Tạo và quản lý thông báo cho users</p>
          </Link>

          <Link
            href="/admin/gpu-workers"
            className="group p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-xl transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-purple-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Server className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">GPU Workers</h3>
                <p className="text-sm text-gray-400">Quản lý GPU servers</p>
              </div>
            </div>
            <p className="text-gray-400">Thêm, xóa, start/stop GPU workers</p>
          </Link>

          <Link
            href="/admin/health-check"
            className="group p-8 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 rounded-xl transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-emerald-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Activity className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Health Check</h3>
                <p className="text-sm text-gray-400">Kiểm tra hệ thống</p>
              </div>
            </div>
            <p className="text-gray-400">Test database, storage, và các tính năng</p>
          </Link>
        </div>
      </main>
    </div>
  );
}

