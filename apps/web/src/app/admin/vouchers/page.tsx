"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Ticket, Calendar, Percent, Edit, Save, X, Trash2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AdminVouchersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVoucher, setNewVoucher] = useState<any>({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: 0,
    max_uses: null,
    expires_at: "",
    is_active: true,
  });
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

    loadVouchers();
  };

  const loadVouchers = async () => {
    const { data, error } = await supabase
      .from("vouchers")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setVouchers(data);
    }
    setLoading(false);
  };

  const startEdit = (voucher: any) => {
    setEditingId(voucher.id);
    setEditForm({
      code: voucher.code,
      description: voucher.description,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      max_uses: voucher.max_uses,
      expires_at: voucher.expires_at ? voucher.expires_at.split('T')[0] : "",
      is_active: voucher.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (voucherId: string) => {
    try {
      const { error } = await supabase
        .from("vouchers")
        .update({
          code: editForm.code,
          description: editForm.description,
          discount_type: editForm.discount_type,
          discount_value: parseFloat(editForm.discount_value),
          max_uses: editForm.max_uses ? parseInt(editForm.max_uses) : null,
          expires_at: editForm.expires_at || null,
          is_active: editForm.is_active,
        })
        .eq("id", voucherId);

      if (error) throw error;

      setMessage("Đã cập nhật voucher thành công!");
      setTimeout(() => setMessage(""), 3000);
      setEditingId(null);
      loadVouchers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteVoucher = async (voucherId: string) => {
    if (!confirm("Bạn có chắc muốn xóa voucher này?")) return;

    try {
      const { error } = await supabase
        .from("vouchers")
        .delete()
        .eq("id", voucherId);

      if (error) throw error;

      setMessage("Đã xóa voucher thành công!");
      setTimeout(() => setMessage(""), 3000);
      loadVouchers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const createVoucher = async () => {
    try {
      const { error } = await supabase
        .from("vouchers")
        .insert({
          code: newVoucher.code.toUpperCase(),
          description: newVoucher.description,
          discount_type: newVoucher.discount_type,
          discount_value: parseFloat(newVoucher.discount_value.toString()),
          max_uses: newVoucher.max_uses ? parseInt(newVoucher.max_uses.toString()) : null,
          expires_at: newVoucher.expires_at || null,
          is_active: newVoucher.is_active,
        });

      if (error) throw error;

      setMessage("Đã tạo voucher thành công!");
      setTimeout(() => setMessage(""), 3000);
      setShowAddForm(false);
      setNewVoucher({
        code: "",
        description: "",
        discount_type: "percentage",
        discount_value: 0,
        max_uses: null,
        expires_at: "",
        is_active: true,
      });
      loadVouchers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Đang tải...</p>
        </div>
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
              <h1 className="text-2xl font-bold">Quản lý Vouchers</h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-medium transition-all"
              >
                <Plus className="h-4 w-4" />
                Tạo Voucher mới
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Messages */}
        {message && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="mb-6 p-6 bg-white/5 border border-white/10 rounded-xl">
            <h3 className="text-xl font-bold mb-4">Tạo Voucher Mới</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Mã Voucher</label>
                <input
                  type="text"
                  value={newVoucher.code}
                  onChange={(e) => setNewVoucher({...newVoucher, code: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                  placeholder="SUMMER2024"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Mô tả</label>
                <input
                  type="text"
                  value={newVoucher.description}
                  onChange={(e) => setNewVoucher({...newVoucher, description: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Loại giảm giá</label>
                <select
                  value={newVoucher.discount_type}
                  onChange={(e) => setNewVoucher({...newVoucher, discount_type: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                >
                  <option value="percentage">Phần trăm (%)</option>
                  <option value="fixed">Cố định (credits)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Giá trị</label>
                <input
                  type="number"
                  value={newVoucher.discount_value}
                  onChange={(e) => setNewVoucher({...newVoucher, discount_value: parseFloat(e.target.value)})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Số lần sử dụng tối đa</label>
                <input
                  type="number"
                  value={newVoucher.max_uses || ""}
                  onChange={(e) => setNewVoucher({...newVoucher, max_uses: e.target.value ? parseInt(e.target.value) : null})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                  placeholder="Không giới hạn"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Ngày hết hạn</label>
                <input
                  type="date"
                  value={newVoucher.expires_at}
                  onChange={(e) => setNewVoucher({...newVoucher, expires_at: e.target.value})}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={createVoucher}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Tạo Voucher
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Hủy
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {vouchers?.map((voucher: any) => {
            const isActive = voucher.is_active &&
              (!voucher.expires_at || new Date(voucher.expires_at) > new Date());
            const usagePercent = voucher.max_uses
              ? (voucher.used_count / voucher.max_uses) * 100
              : 0;
            const isEditing = editingId === voucher.id;

            return (
              <div
                key={voucher.id}
                className="p-6 bg-white/5 border border-white/10 rounded-xl"
              >
                {isEditing ? (
                  // Edit Mode
                  <div>
                    <h3 className="text-xl font-bold mb-4">Chỉnh sửa Voucher</h3>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Mã Voucher</label>
                        <input
                          type="text"
                          value={editForm.code}
                          onChange={(e) => setEditForm({...editForm, code: e.target.value.toUpperCase()})}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Mô tả</label>
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Giá trị</label>
                        <input
                          type="number"
                          value={editForm.discount_value}
                          onChange={(e) => setEditForm({...editForm, discount_value: e.target.value})}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Số lần sử dụng tối đa</label>
                        <input
                          type="number"
                          value={editForm.max_uses || ""}
                          onChange={(e) => setEditForm({...editForm, max_uses: e.target.value})}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Ngày hết hạn</label>
                        <input
                          type="date"
                          value={editForm.expires_at}
                          onChange={(e) => setEditForm({...editForm, expires_at: e.target.value})}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm text-gray-400">
                          <input
                            type="checkbox"
                            checked={editForm.is_active}
                            onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                            className="rounded"
                          />
                          Kích hoạt
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveEdit(voucher.id)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Lưu
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/20 rounded-lg">
                          <Ticket className="h-6 w-6 text-green-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-bold font-mono">{voucher.code}</h3>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                isActive
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {isActive ? "Hoạt động" : "Không hoạt động"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">{voucher.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Percent className="h-4 w-4 text-blue-400" />
                          <span className="text-sm text-gray-400">Giảm giá</span>
                        </div>
                        <div className="text-xl font-bold">
                          {voucher.discount_type === "percentage"
                            ? `${voucher.discount_value}%`
                            : `${voucher.discount_value} credits`}
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Ticket className="h-4 w-4 text-purple-400" />
                          <span className="text-sm text-gray-400">Đã dùng</span>
                        </div>
                        <div className="text-xl font-bold">
                          {voucher.used_count} / {voucher.max_uses || "∞"}
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm text-gray-400">Hết hạn</span>
                        </div>
                        <div className="text-sm font-medium">
                          {voucher.expires_at
                            ? new Date(voucher.expires_at).toLocaleDateString("vi-VN")
                            : "Không giới hạn"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(voucher)}
                        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm transition-colors flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Sửa
                      </button>
                      <button
                        onClick={() => deleteVoucher(voucher.id)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {(!vouchers || vouchers.length === 0) && (
          <div className="text-center py-20">
            <Ticket className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-2xl font-bold mb-2">Chưa có vouchers</h2>
            <p className="text-gray-400 mb-8">Tạo voucher đầu tiên để bắt đầu</p>
          </div>
        )}
      </main>
    </div>
  );
}

