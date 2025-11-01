"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const BANKS = [
  { bin: '970415', name: 'Ngân hàng TMCP An Bình', shortName: 'ABBANK', logo: 'https://api.vietqr.io/v2/img/ABBANK.png' },
  { bin: '970416', name: 'Ngân hàng TMCP Á Châu', shortName: 'ACB', logo: 'https://api.vietqr.io/v2/img/ACB.png' },
  { bin: '970418', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', shortName: 'BIDV', logo: 'https://api.vietqr.io/v2/img/BIDV.png' },
  { bin: '970436', name: 'Ngân hàng TMCP Ngoại thương Việt Nam', shortName: 'Vietcombank', logo: 'https://api.vietqr.io/v2/img/VCB.png' },
  { bin: '970405', name: 'Ngân hàng TMCP Công Thương Việt Nam', shortName: 'VietinBank', logo: 'https://api.vietqr.io/v2/img/VIETINBANK.png' },
  { bin: '970407', name: 'Ngân hàng TMCP Kỹ thương Việt Nam', shortName: 'Techcombank', logo: 'https://api.vietqr.io/v2/img/TCB.png' },
  { bin: '970422', name: 'Ngân hàng TMCP Quân đội', shortName: 'MB Bank', logo: 'https://api.vietqr.io/v2/img/MBBANK.png' },
  { bin: '970423', name: 'Ngân hàng TMCP Tiên Phong', shortName: 'TPBank', logo: 'https://api.vietqr.io/v2/img/TPBANK.png' },
  { bin: '970432', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', shortName: 'VPBank', logo: 'https://api.vietqr.io/v2/img/VPBANK.png' },
];

export default function AdminPaymentMethodsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState("");



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

    loadMethods();
  };

  const loadMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setMethods(data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const startEdit = (method: any) => {
    setEditingId(method.id);
    setEditForm({ ...method });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    try {
      // Auto-generate QR code if not provided
      let qrCodeUrl = editForm.qr_code_url;
      if (!qrCodeUrl && editForm.bank_name && editForm.account_number && editForm.account_name) {
        qrCodeUrl = generateQRCodeUrl(editForm.bank_name, editForm.account_number, editForm.account_name);
      }

      const { error } = await supabase
        .from("payment_methods")
        .update({
          method_type: editForm.method_type,
          bank_name: editForm.bank_name,
          account_number: editForm.account_number,
          account_name: editForm.account_name,
          qr_code_url: qrCodeUrl,
          is_active: editForm.is_active,
        })
        .eq("id", editingId);

      if (error) throw error;

      setMessage("Cập nhật thành công!");
      setTimeout(() => setMessage(""), 3000);
      setEditingId(null);
      loadMethods();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleAdd = async () => {
    try {
      // Auto-generate QR code if not provided
      let qrCodeUrl = editForm.qr_code_url;
      if (!qrCodeUrl && editForm.bank_name && editForm.account_number && editForm.account_name) {
        qrCodeUrl = generateQRCodeUrl(editForm.bank_name, editForm.account_number, editForm.account_name);
      }

      const { error } = await supabase
        .from("payment_methods")
        .insert({
          method_type: editForm.method_type || "bank_transfer",
          bank_name: editForm.bank_name,
          account_number: editForm.account_number,
          account_name: editForm.account_name,
          qr_code_url: qrCodeUrl,
          is_active: true,
        });

      if (error) throw error;

      setMessage("Thêm thành công!");
      setTimeout(() => setMessage(""), 3000);
      setShowAddForm(false);
      setEditForm({});
      loadMethods();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xác nhận xóa phương thức thanh toán này?")) return;

    try {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setMessage("Xóa thành công!");
      setTimeout(() => setMessage(""), 3000);
      loadMethods();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  // Auto-generate QR code URL from bank info
  const generateQRCodeUrl = (bankName: string, accountNumber: string, accountName: string): string => {
    if (!bankName || !accountNumber || !accountName) return "";

    // Find bank by name (exact match or partial match)
    const bank = BANKS.find(b =>
      b.shortName.toLowerCase() === bankName.toLowerCase() ||
      b.name.toLowerCase().includes(bankName.toLowerCase()) ||
      bankName.toLowerCase().includes(b.shortName.toLowerCase())
    );

    if (!bank) return "";

    const template = "compact2";
    let url = `https://img.vietqr.io/image/${bank.bin}-${accountNumber}-${template}.png`;

    const params = new URLSearchParams();
    params.append("accountName", accountName);

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    return url;
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#0F172A] dark:to-[#1E293B] text-gray-900 dark:text-white flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#0F172A] dark:to-[#1E293B] text-gray-900 dark:text-white">
      <header className="border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Admin</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-white/20"></div>
              <h1 className="text-2xl font-bold">Phương thức thanh toán</h1>
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

        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 text-white"
          >
            <Plus className="h-5 w-5" />
            Thêm phương thức
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="mb-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Thêm phương thức thanh toán</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Loại</label>
                <select
                  value={editForm.method_type || "bank_transfer"}
                  onChange={(e) => setEditForm({ ...editForm, method_type: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                  <option value="momo">MoMo</option>
                  <option value="zalopay">ZaloPay</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Tên ngân hàng</label>
                <input
                  type="text"
                  value={editForm.bank_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  placeholder="Vietcombank, MoMo, etc."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Số tài khoản</label>
                <input
                  type="text"
                  value={editForm.account_number || ""}
                  onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  placeholder="1234567890"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Chủ tài khoản</label>
                <input
                  type="text"
                  value={editForm.account_name || ""}
                  onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  placeholder="NGUYEN VAN A"
                />
              </div>
              <div className="md:col-span-2">
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 <strong>Mã QR sẽ tự động được tạo</strong> khi bạn lưu phương thức thanh toán (nếu có đủ thông tin ngân hàng, số tài khoản và tên tài khoản).
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Lưu
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditForm({});
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Methods List */}
        <div className="grid gap-4">
          {methods.map((method) => {
            const isEditing = editingId === method.id;

            return (
              <div
                key={method.id}
                className="bg-white/5 border border-white/10 rounded-xl p-6"
              >
                {isEditing ? (
                  <div>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Loại</label>
                        <select
                          value={editForm.method_type}
                          onChange={(e) => setEditForm({ ...editForm, method_type: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                        >
                          <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                          <option value="momo">MoMo</option>
                          <option value="zalopay">ZaloPay</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Tên ngân hàng</label>
                        <input
                          type="text"
                          value={editForm.bank_name || ""}
                          onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Số tài khoản</label>
                        <input
                          type="text"
                          value={editForm.account_number}
                          onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Chủ tài khoản</label>
                        <input
                          type="text"
                          value={editForm.account_name}
                          onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-400 mb-2">QR Code URL</label>
                        <input
                          type="text"
                          value={editForm.qr_code_url || ""}
                          onChange={(e) => setEditForm({ ...editForm, qr_code_url: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editForm.is_active}
                            onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Kích hoạt</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={saveEdit}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Lưu
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`px-3 py-1 rounded-full text-sm ${
                          method.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                        }`}>
                          {method.is_active ? "Kích hoạt" : "Tắt"}
                        </div>
                        <div className="text-sm text-gray-400">{method.method_type}</div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-400">Ngân hàng</div>
                          <div className="font-semibold">{method.bank_name}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Số tài khoản</div>
                          <div className="font-mono">{method.account_number}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Chủ tài khoản</div>
                          <div>{method.account_name}</div>
                        </div>
                        {method.qr_code_url && (
                          <div>
                            <div className="text-sm text-gray-400">QR Code</div>
                            <a href={method.qr_code_url} target="_blank" className="text-blue-400 hover:underline text-sm">
                              Xem QR
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <button
                        onClick={() => startEdit(method)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(method.id)}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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

