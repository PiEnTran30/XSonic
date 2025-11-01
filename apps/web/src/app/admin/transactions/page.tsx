import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export default async function AdminTransactionsPage() {
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

  // Fetch all transactions with user info
  const { data: transactions } = await supabase
    .from("wallet_transactions")
    .select(`
      *,
      users (email, metadata)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  const typeConfig = {
    credit: { icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/20", label: "Credit" },
    debit: { icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/20", label: "Debit" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Admin</span>
            </Link>
            <div className="h-6 w-px bg-white/20"></div>
            <h1 className="text-2xl font-bold">Transactions</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Reason</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {transactions?.map((tx: any) => {
                  const config = typeConfig[tx.type as keyof typeof typeConfig];
                  const Icon = config.icon;

                  return (
                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(tx.created_at).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium">{tx.users?.metadata?.full_name || "No name"}</div>
                          <div className="text-gray-400">{tx.users?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 px-3 py-1 ${config.bg} rounded-full w-fit`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-lg font-bold ${config.color}`}>
                          {tx.type === "credit" ? "+" : "-"}{tx.amount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {tx.reason}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-yellow-400" />
                          <span className="font-bold">{tx.balance_after}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {(!transactions || transactions.length === 0) && (
          <div className="text-center py-20">
            <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-2xl font-bold mb-2">Chưa có transactions</h2>
            <p className="text-gray-400">Transactions sẽ hiển thị ở đây</p>
          </div>
        )}
      </main>
    </div>
  );
}

