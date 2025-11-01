"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Eye, Clock } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";

export default function AdminPaymentsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, [filter]);

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

    loadRequests();
  };

  const loadRequests = async () => {
    try {
      let query = supabase
        .from("payment_requests")
        .select(`
          *,
          users!payment_requests_user_id_fkey(email, metadata),
          plans(name, price_monthly, credits_monthly),
          payment_methods(bank_name, account_number)
        `)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      console.log("Payment requests query result:", { data, error });

      if (error) throw error;

      setRequests(data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error loading payment requests:", err);
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm("Xác nhận duyệt thanh toán này?")) return;

    try {
      setProcessing(true);

      const { data, error } = await supabase.rpc("approve_payment_request", {
        request_id: requestId,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        note: adminNote || null,
      });

      if (error) throw error;

      alert("Đã duyệt thanh toán!");
      setSelectedRequest(null);
      setAdminNote("");
      loadRequests();
      setProcessing(false);
    } catch (err: any) {
      console.error(err);
      alert("Lỗi: " + err.message);
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!adminNote.trim()) {
      alert("Vui lòng nhập lý do từ chối!");
      return;
    }

    if (!confirm("Xác nhận từ chối thanh toán này?")) return;

    try {
      setProcessing(true);

      const { data, error } = await supabase.rpc("reject_payment_request", {
        request_id: requestId,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        note: adminNote,
      });

      if (error) throw error;

      alert("Đã từ chối thanh toán!");
      setSelectedRequest(null);
      setAdminNote("");
      loadRequests();
      setProcessing(false);
    } catch (err: any) {
      console.error(err);
      alert("Lỗi: " + err.message);
      setProcessing(false);
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
              <Link href="/admin" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Admin</span>
              </Link>
              <div className="h-6 w-px bg-white/20"></div>
              <h1 className="text-2xl font-bold">Quản lý Thanh toán</h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filter */}
        <div className="mb-6 flex gap-2">
          {["all", "pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === status
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {status === "all" && "Tất cả"}
              {status === "pending" && "Chờ duyệt"}
              {status === "approved" && "Đã duyệt"}
              {status === "rejected" && "Đã từ chối"}
            </button>
          ))}
        </div>

        {/* Requests List */}
        <div className="grid gap-4">
          {requests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Không có yêu cầu thanh toán nào
            </div>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`px-3 py-1 rounded-full text-sm ${
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

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400">User</div>
                        <div className="font-semibold">{request.users?.email}</div>
                      </div>
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
                        <div className="text-sm text-gray-400">Nội dung CK</div>
                        <code className="text-yellow-400 font-mono">{request.transfer_content}</code>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Ngân hàng</div>
                        <div>{request.payment_methods?.bank_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">STK</div>
                        <div className="font-mono">{request.payment_methods?.account_number}</div>
                      </div>
                    </div>

                    {request.admin_note && (
                      <div className="mt-4 p-3 bg-black/30 rounded-lg">
                        <div className="text-sm text-gray-400">Ghi chú admin</div>
                        <div>{request.admin_note}</div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Xem
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

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

                {/* Proof Image */}
                {selectedRequest.proof_image_url && (
                  <div className="mb-6">
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

                {/* Admin Actions */}
                {selectedRequest.status === "pending" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Ghi chú (tùy chọn)
                      </label>
                      <textarea
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                        rows={3}
                        placeholder="Nhập ghi chú..."
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(selectedRequest.id)}
                        disabled={processing}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-5 w-5" />
                        {processing ? "Đang xử lý..." : "Duyệt"}
                      </button>
                      <button
                        onClick={() => handleReject(selectedRequest.id)}
                        disabled={processing}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="h-5 w-5" />
                        {processing ? "Đang xử lý..." : "Từ chối"}
                      </button>
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

