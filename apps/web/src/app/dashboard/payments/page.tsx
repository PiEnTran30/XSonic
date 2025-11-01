"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";

export default function UserPaymentsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  useEffect(() => {
    loadRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("payment_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_requests",
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("payment_requests")
        .select(`
          *,
          plans(name, price_monthly, credits_monthly),
          payment_methods(bank_name, account_number)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests(data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-white/20"></div>
              <h1 className="text-2xl font-bold">Lịch sử thanh toán</h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">Bạn chưa có yêu cầu thanh toán nào</div>
            <Link
              href="/pricing"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Mua gói ngay
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        request.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                        request.status === "approved" ? "bg-green-500/20 text-green-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {request.status === "pending" && <Clock className="inline h-4 w-4 mr-1" />}
                        {request.status === "approved" && <CheckCircle className="inline h-4 w-4 mr-1" />}
                        {request.status === "rejected" && <XCircle className="inline h-4 w-4 mr-1" />}
                        {request.status === "pending" && "Chờ duyệt"}
                        {request.status === "approved" && "Đã duyệt"}
                        {request.status === "rejected" && "Đã từ chối"}
                      </div>
                      <div className="text-sm text-gray-400">
                        {new Date(request.created_at).toLocaleString("vi-VN")}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-400">Gói</div>
                        <div className="font-semibold">{request.plans?.name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Số tiền</div>
                        <div className="text-lg font-bold text-blue-400">
                          {request.amount.toLocaleString("vi-VN")} VNĐ
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Credits</div>
                        <div className="font-semibold">{request.plans?.credits_monthly} credits</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-sm text-gray-400">Nội dung chuyển khoản</div>
                      <code className="text-yellow-400 font-mono">{request.transfer_content}</code>
                    </div>

                    {request.admin_note && (
                      <div className="mt-4 p-3 bg-black/30 rounded-lg border-l-4 border-blue-500">
                        <div className="text-sm text-gray-400">Ghi chú từ Admin</div>
                        <div className="mt-1">{request.admin_note}</div>
                      </div>
                    )}

                    {request.status === "pending" && (
                      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <div className="text-sm text-yellow-400">
                          ⏳ Yêu cầu của bạn đang được xử lý. Admin sẽ kiểm tra trong vòng 24h.
                        </div>
                      </div>
                    )}

                    {request.status === "approved" && request.approved_at && (
                      <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="text-sm text-green-400">
                          ✅ Đã duyệt lúc {new Date(request.approved_at).toLocaleString("vi-VN")}
                        </div>
                      </div>
                    )}

                    {request.status === "rejected" && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div className="text-sm text-red-400">
                          ❌ Yêu cầu bị từ chối. Vui lòng kiểm tra lại thông tin chuyển khoản.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Chi tiết
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1E293B] border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Chi tiết thanh toán</h2>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="p-2 hover:bg-white/10 rounded-lg"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-400">Trạng thái</div>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedRequest.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                      selectedRequest.status === "approved" ? "bg-green-500/20 text-green-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      {selectedRequest.status === "pending" && "Chờ duyệt"}
                      {selectedRequest.status === "approved" && "Đã duyệt"}
                      {selectedRequest.status === "rejected" && "Đã từ chối"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400">Gói đã mua</div>
                    <div className="font-semibold">{selectedRequest.plans?.name}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400">Số tiền</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {selectedRequest.amount.toLocaleString("vi-VN")} VNĐ
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400">Ngân hàng</div>
                    <div>{selectedRequest.payment_methods?.bank_name}</div>
                    <div className="font-mono text-sm">{selectedRequest.payment_methods?.account_number}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400">Nội dung chuyển khoản</div>
                    <code className="text-yellow-400 font-mono">{selectedRequest.transfer_content}</code>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400">Thời gian tạo</div>
                    <div>{new Date(selectedRequest.created_at).toLocaleString("vi-VN")}</div>
                  </div>

                  {selectedRequest.approved_at && (
                    <div>
                      <div className="text-sm text-gray-400">Thời gian duyệt</div>
                      <div>{new Date(selectedRequest.approved_at).toLocaleString("vi-VN")}</div>
                    </div>
                  )}
                </div>

                {/* Proof Image */}
                {selectedRequest.proof_image_url && (
                  <div>
                    <div className="text-sm text-gray-400 mb-2">Ảnh chuyển khoản</div>
                    <div className="relative w-full h-96 bg-black/30 rounded-lg overflow-hidden">
                      <Image
                        src={selectedRequest.proof_image_url}
                        alt="Proof"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

