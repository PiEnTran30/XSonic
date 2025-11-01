"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Loader2, AlertTriangle, Database, HardDrive, Zap, Users, Package } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface HealthCheck {
  name: string;
  status: "checking" | "success" | "error" | "warning";
  message: string;
  details?: any;
}

export default function AdminHealthCheckPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [overallStatus, setOverallStatus] = useState<"checking" | "healthy" | "unhealthy" | "warning">("checking");

  useEffect(() => {
    checkAdminAndRunTests();
  }, []);

  const checkAdminAndRunTests = async () => {
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

    await runHealthChecks();
  };

  const runHealthChecks = async () => {
    // Run all checks in parallel for better performance
    const [
      dbCheck,
      tablesCheck,
      storageCheck,
      rlsCheck,
      authCheck,
      walletCheck,
      plansCheck,
      paymentCheck,
      driveCheck,
    ] = await Promise.all([
      checkDatabaseConnection(),
      checkTablesExist(),
      checkStorageBuckets(),
      checkRLSPolicies(),
      checkUserAuth(),
      checkWalletSystem(),
      checkPlansSystem(),
      checkPaymentSystem(),
      checkGoogleDrive(),
    ]);

    const healthChecks = [
      dbCheck,
      tablesCheck,
      storageCheck,
      rlsCheck,
      authCheck,
      walletCheck,
      plansCheck,
      paymentCheck,
      driveCheck,
    ];

    setChecks(healthChecks);

    // Calculate overall status
    const hasError = healthChecks.some(c => c.status === "error");
    const hasWarning = healthChecks.some(c => c.status === "warning");
    
    if (hasError) {
      setOverallStatus("unhealthy");
    } else if (hasWarning) {
      setOverallStatus("warning");
    } else {
      setOverallStatus("healthy");
    }

    setLoading(false);
  };

  const checkDatabaseConnection = async (): Promise<HealthCheck> => {
    try {
      const { data, error } = await supabase.from("users").select("count").limit(1);
      
      if (error) throw error;

      return {
        name: "Database Connection",
        status: "success",
        message: "Kết nối database thành công",
      };
    } catch (err: any) {
      return {
        name: "Database Connection",
        status: "error",
        message: `Lỗi kết nối database: ${err.message}`,
      };
    }
  };

  const checkTablesExist = async (): Promise<HealthCheck> => {
    try {
      const tables = ["users", "wallets", "plans", "jobs", "wallet_transactions", "payment_requests", "payment_methods"];
      const results = await Promise.all(
        tables.map(async (table) => {
          const { error } = await supabase.from(table).select("count").limit(1);
          return { table, exists: !error };
        })
      );

      const missingTables = results.filter(r => !r.exists).map(r => r.table);

      if (missingTables.length > 0) {
        return {
          name: "Database Tables",
          status: "error",
          message: `Thiếu ${missingTables.length} bảng: ${missingTables.join(", ")}`,
          details: { missing: missingTables },
        };
      }

      return {
        name: "Database Tables",
        status: "success",
        message: `Tất cả ${tables.length} bảng đều tồn tại`,
        details: { tables },
      };
    } catch (err: any) {
      return {
        name: "Database Tables",
        status: "error",
        message: `Lỗi kiểm tra bảng: ${err.message}`,
      };
    }
  };

  const checkStorageBuckets = async (): Promise<HealthCheck> => {
    try {
      // Call API endpoint to check buckets (uses service role key)
      const response = await fetch("/api/admin/check-buckets");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to check buckets");
      }

      const { existing, missing } = result;

      if (missing.length > 0) {
        return {
          name: "Storage Buckets",
          status: "error",
          message: `Thiếu ${missing.length} bucket: ${missing.join(", ")}`,
          details: { missing, existing },
        };
      }

      return {
        name: "Storage Buckets",
        status: "success",
        message: `Tất cả ${existing.length} buckets đều tồn tại`,
        details: { buckets: existing },
      };
    } catch (err: any) {
      return {
        name: "Storage Buckets",
        status: "error",
        message: `Lỗi kiểm tra storage: ${err.message}`,
      };
    }
  };

  const createStorageBuckets = async () => {
    try {
      // Call API endpoint with service role key
      const response = await fetch("/api/admin/create-buckets", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create buckets");
      }

      alert("✅ Đã tạo storage buckets thành công!");
      await runHealthChecks();
    } catch (err: any) {
      alert(`❌ Lỗi tạo buckets: ${err.message}`);
    }
  };

  const createDefaultPlans = async () => {
    try {
      // Call API endpoint with service role key
      const response = await fetch("/api/admin/create-plans", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create plans");
      }

      alert("✅ Đã tạo 4 plans mặc định thành công!");
      await runHealthChecks();
    } catch (err: any) {
      alert(`❌ Lỗi tạo plans: ${err.message}`);
    }
  };

  const refreshDriveToken = async () => {
    try {
      // Step 1: Get auth URL
      const response = await fetch("/api/admin/refresh-drive-token");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get auth URL");
      }

      // Open OAuth URL in new window
      const authWindow = window.open(result.authUrl, "_blank", "width=600,height=700");

      // Show instructions
      const code = prompt(
        "📋 Hướng dẫn:\n\n" +
        "1. Cửa sổ Google OAuth đã mở\n" +
        "2. Đăng nhập tài khoản Google có Drive 2TB\n" +
        "3. Click 'Allow' để cấp quyền\n" +
        "4. Copy authorization code\n" +
        "5. Paste vào đây:\n"
      );

      if (!code) {
        alert("❌ Đã hủy");
        return;
      }

      // Step 2: Exchange code for refresh token
      const exchangeResponse = await fetch("/api/admin/refresh-drive-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const exchangeResult = await exchangeResponse.json();

      if (!exchangeResponse.ok) {
        throw new Error(exchangeResult.error || "Failed to exchange code");
      }

      // Show refresh token
      alert(
        "✅ Thành công!\n\n" +
        "Copy refresh token này vào .env.local:\n\n" +
        `GOOGLE_OAUTH_REFRESH_TOKEN=${exchangeResult.refreshToken}\n\n` +
        "Sau đó restart dev server!"
      );

      await runHealthChecks();
    } catch (err: any) {
      alert(`❌ Lỗi: ${err.message}`);
    }
  };

  const checkRLSPolicies = async (): Promise<HealthCheck> => {
    try {
      // Try to query with RLS enabled
      const { error } = await supabase.from("users").select("id").limit(1);
      
      if (error) throw error;

      return {
        name: "RLS Policies",
        status: "success",
        message: "RLS policies hoạt động bình thường",
      };
    } catch (err: any) {
      return {
        name: "RLS Policies",
        status: "warning",
        message: `Cảnh báo RLS: ${err.message}`,
      };
    }
  };

  const checkUserAuth = async (): Promise<HealthCheck> => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      if (!user) throw new Error("No user logged in");

      return {
        name: "User Authentication",
        status: "success",
        message: `Đã đăng nhập: ${user.email}`,
        details: { userId: user.id, email: user.email },
      };
    } catch (err: any) {
      return {
        name: "User Authentication",
        status: "error",
        message: `Lỗi xác thực: ${err.message}`,
      };
    }
  };

  const checkWalletSystem = async (): Promise<HealthCheck> => {
    try {
      const { count, error } = await supabase
        .from("wallets")
        .select("*", { count: "exact", head: true });
      
      if (error) throw error;

      return {
        name: "Wallet System",
        status: "success",
        message: `Hệ thống ví hoạt động (${count || 0} wallets)`,
        details: { totalWallets: count },
      };
    } catch (err: any) {
      return {
        name: "Wallet System",
        status: "error",
        message: `Lỗi wallet system: ${err.message}`,
      };
    }
  };

  const checkPlansSystem = async (): Promise<HealthCheck> => {
    try {
      const { data: plans, error } = await supabase
        .from("plans")
        .select("*");
      
      if (error) throw error;

      if (!plans || plans.length === 0) {
        return {
          name: "Plans & Pricing",
          status: "warning",
          message: "Chưa có plans nào trong hệ thống",
        };
      }

      return {
        name: "Plans & Pricing",
        status: "success",
        message: `Có ${plans.length} plans trong hệ thống`,
        details: { plans: plans.map(p => p.name) },
      };
    } catch (err: any) {
      return {
        name: "Plans & Pricing",
        status: "error",
        message: `Lỗi plans system: ${err.message}`,
      };
    }
  };

  const checkPaymentSystem = async (): Promise<HealthCheck> => {
    try {
      const { data: methods, error: methodsError } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true);

      if (methodsError) throw methodsError;

      const { count: requestsCount, error: requestsError } = await supabase
        .from("payment_requests")
        .select("*", { count: "exact", head: true });

      if (requestsError) throw requestsError;

      if (!methods || methods.length === 0) {
        return {
          name: "Payment System",
          status: "warning",
          message: "Chưa có payment methods nào",
          details: { totalRequests: requestsCount },
        };
      }

      return {
        name: "Payment System",
        status: "success",
        message: `${methods.length} payment methods, ${requestsCount || 0} requests`,
        details: { methods: methods.length, requests: requestsCount },
      };
    } catch (err: any) {
      return {
        name: "Payment System",
        status: "error",
        message: `Lỗi payment system: ${err.message}`,
      };
    }
  };

  const checkGoogleDrive = async (): Promise<HealthCheck> => {
    try {
      const response = await fetch("/api/admin/test-drive");
      const result = await response.json();

      if (!response.ok || !result.success) {
        return {
          name: "Google Drive",
          status: "error",
          message: result.message || "Google Drive connection failed",
          details: result.details,
        };
      }

      return {
        name: "Google Drive",
        status: "success",
        message: result.message,
        details: result.details,
      };
    } catch (err: any) {
      return {
        name: "Google Drive",
        status: "error",
        message: `Lỗi kiểm tra Google Drive: ${err.message}`,
      };
    }
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "error":
        return <XCircle className="h-6 w-6 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      default:
        return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "border-green-500/30 bg-green-500/10";
      case "error":
        return "border-red-500/30 bg-red-500/10";
      case "warning":
        return "border-yellow-500/30 bg-yellow-500/10";
      default:
        return "border-blue-500/30 bg-blue-500/10";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Admin Panel</span>
              </Link>
              <div className="h-6 w-px bg-white/20"></div>
              <h1 className="text-2xl font-bold">🏥 Health Check</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Overall Status */}
        <div className={`mb-8 p-6 rounded-xl border ${
          overallStatus === "healthy" ? "bg-green-500/10 border-green-500/30" :
          overallStatus === "unhealthy" ? "bg-red-500/10 border-red-500/30" :
          overallStatus === "warning" ? "bg-yellow-500/10 border-yellow-500/30" :
          "bg-blue-500/10 border-blue-500/30"
        }`}>
          <div className="flex items-center gap-4">
            {overallStatus === "checking" && <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />}
            {overallStatus === "healthy" && <CheckCircle className="h-8 w-8 text-green-500" />}
            {overallStatus === "unhealthy" && <XCircle className="h-8 w-8 text-red-500" />}
            {overallStatus === "warning" && <AlertTriangle className="h-8 w-8 text-yellow-500" />}
            <div>
              <h2 className="text-2xl font-bold">
                {overallStatus === "checking" && "Đang kiểm tra..."}
                {overallStatus === "healthy" && "Hệ thống hoạt động bình thường"}
                {overallStatus === "unhealthy" && "Phát hiện lỗi trong hệ thống"}
                {overallStatus === "warning" && "Hệ thống có cảnh báo"}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {checks.length} kiểm tra đã hoàn thành
              </p>
            </div>
          </div>
        </div>

        {/* Health Checks */}
        <div className="grid gap-4">
          {checks.map((check, index) => (
            <div
              key={index}
              className={`p-6 rounded-xl border ${getStatusColor(check.status)}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(check.status)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1">{check.name}</h3>
                  <p className="text-gray-300">{check.message}</p>
                  {check.details && (
                    <pre className="mt-3 p-3 bg-black/30 rounded text-xs overflow-x-auto">
                      {JSON.stringify(check.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              setLoading(true);
              setOverallStatus("checking");
              runHealthChecks();
            }}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors font-medium"
          >
            {loading ? "Đang kiểm tra..." : "🔄 Chạy lại kiểm tra"}
          </button>

          <button
            onClick={createStorageBuckets}
            disabled={loading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg transition-colors font-medium"
          >
            📦 Tạo Storage Buckets
          </button>

          <button
            onClick={createDefaultPlans}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg transition-colors font-medium"
          >
            📋 Tạo Plans mặc định
          </button>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <button
            onClick={refreshDriveToken}
            disabled={loading}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded-lg transition-colors font-medium"
          >
            🔑 Refresh Google Drive Token
          </button>

          <button
            onClick={async () => {
              if (confirm("Tạo 1 test job để kiểm tra hệ thống?")) {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;

                  const { data, error } = await supabase
                    .from("jobs")
                    .insert({
                      user_id: user.id,
                      tool_id: "test-tool",
                      status: "pending",
                      input_data: { test: true },
                      credits_used: 0,
                    })
                    .select()
                    .single();

                  if (error) throw error;
                  alert(`✅ Đã tạo test job: ${data.id}`);
                  runHealthChecks();
                } catch (err: any) {
                  alert(`❌ Lỗi: ${err.message}`);
                }
              }
            }}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors font-medium"
          >
            🧪 Test tạo Job
          </button>
        </div>

        <div className="mt-4 grid md:grid-cols-1 gap-4">
          <button
            onClick={async () => {
              if (confirm("Thêm 100 credits vào ví của bạn?")) {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;

                  const { data: wallet } = await supabase
                    .from("wallets")
                    .select("balance_credits")
                    .eq("user_id", user.id)
                    .single();

                  const { error } = await supabase
                    .from("wallets")
                    .update({ balance_credits: (wallet?.balance_credits || 0) + 100 })
                    .eq("user_id", user.id);

                  if (error) throw error;
                  alert("✅ Đã thêm 100 credits!");
                  runHealthChecks();
                } catch (err: any) {
                  alert(`❌ Lỗi: ${err.message}`);
                }
              }
            }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium"
          >
            💰 Test thêm Credits
          </button>
        </div>
      </main>
    </div>
  );
}

