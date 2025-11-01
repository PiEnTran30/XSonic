"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function UserTransactionsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      setTransactions(data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
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
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-white/20"></div>
              <h1 className="text-2xl font-bold">Transaction History</h1>
            </div>
            <ThemeToggle />
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
                  <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Reason</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {transactions?.map((tx: any) => {
                  const isCredit = tx.type === "credit";
                  const Icon = isCredit ? TrendingUp : TrendingDown;
                  const colorClass = isCredit ? "text-green-400" : "text-red-400";
                  const bgClass = isCredit ? "bg-green-500/20" : "bg-red-500/20";

                  return (
                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(tx.created_at).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 px-3 py-1 ${bgClass} rounded-full w-fit`}>
                          <Icon className={`h-4 w-4 ${colorClass}`} />
                          <span className={`text-sm font-medium ${colorClass}`}>
                            {isCredit ? "Credit" : "Debit"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-lg font-bold ${colorClass}`}>
                          {isCredit ? "+" : "-"}{tx.amount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {tx.reason || tx.description}
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
            <h2 className="text-2xl font-bold mb-2">No transactions yet</h2>
            <p className="text-gray-400">Your transaction history will appear here</p>
            <Link
              href="/pricing"
              className="inline-block mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Buy Credits
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

