"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, CheckCircle, XCircle, Copy, Check } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const planId = searchParams.get("plan");

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [transferContent, setTransferContent] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [planId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Load plan
      const { data: planData } = await supabase
        .from("plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (!planData) {
        router.push("/pricing");
        return;
      }

      // Use price_monthly as the price in VND
      setPlan({ ...planData, price: planData.price_monthly });

      // Load payment methods
      const { data: methodsData } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true);

      setPaymentMethods(methodsData || []);
      if (methodsData && methodsData.length > 0) {
        setSelectedMethod(methodsData[0]);
      }

      // Generate transfer content
      const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      setTransferContent(`XSONIC${randomCode}`);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!proofImage) {
      alert("Vui lòng upload ảnh chuyển khoản!");
      return;
    }

    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload proof image
      const fileName = `${user.id}/${Date.now()}_${proofImage.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, proofImage);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);

      // Create payment request
      const { error: requestError } = await supabase
        .from("payment_requests")
        .insert({
          user_id: user.id,
          plan_id: planId,
          payment_method_id: selectedMethod.id,
          amount: plan.price,
          transfer_content: transferContent,
          proof_image_url: publicUrl,
          status: "pending",
        });

      if (requestError) throw requestError;

      setSubmitted(true);
      setUploading(false);
    } catch (err: any) {
      console.error(err);
      alert("Lỗi: " + err.message);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
        <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Thanh toán</h1>
              <div className="flex items-center gap-3">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 md:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <CheckCircle className="h-16 w-16 md:h-20 md:w-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Gửi yêu cầu thành công!</h2>
            <p className="text-gray-400 mb-8 text-sm md:text-base">
              Yêu cầu thanh toán của bạn đã được gửi. Admin sẽ kiểm tra và duyệt trong vòng 24h.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm md:text-base"
              >
                Về Dashboard
              </Link>
              <Link
                href="/dashboard/payments"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm md:text-base"
              >
                Xem lịch sử thanh toán
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gradient-to-b dark:from-[#0F172A] dark:to-[#1E293B] text-gray-900 dark:text-white">
      <header className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/pricing" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>Quay lại</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-white/20"></div>
              <h1 className="text-2xl font-bold">Thanh toán</h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Left: Plan Info */}
            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 md:p-6">
              <h2 className="text-xl font-bold mb-4">Thông tin gói</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Gói</div>
                  <div className="text-lg font-semibold">{plan.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Giá</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {plan.price ? plan.price.toLocaleString("vi-VN") : "0"} VNĐ
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Credits</div>
                  <div className="text-lg">{plan.credits_monthly || 0} credits</div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
                <h3 className="font-semibold mb-3">Phương thức thanh toán</h3>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method)}
                      className={`w-full p-3 rounded-lg border transition-colors text-left ${
                        selectedMethod?.id === method.id
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10"
                      }`}
                    >
                      <div className="font-semibold">{method.bank_name || method.method_type}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{method.account_number}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Payment Instructions */}
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Hướng dẫn thanh toán</h2>

                {selectedMethod && (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ngân hàng</div>
                      <div className="font-semibold">{selectedMethod.bank_name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Số tài khoản</div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{selectedMethod.account_number}</span>
                        <button
                          onClick={() => copyToClipboard(selectedMethod.account_number)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded"
                        >
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Chủ tài khoản</div>
                      <div className="font-semibold">{selectedMethod.account_name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Số tiền</div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {plan.price ? plan.price.toLocaleString("vi-VN") : "0"} VNĐ
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Nội dung chuyển khoản</div>
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-2 bg-gray-200 dark:bg-black/30 rounded font-mono text-orange-600 dark:text-yellow-400">
                          {transferContent}
                        </code>
                        <button
                          onClick={() => copyToClipboard(transferContent)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded"
                        >
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="text-xs text-orange-600 dark:text-yellow-400 mt-1">
                        ⚠️ Vui lòng nhập chính xác nội dung này
                      </div>
                    </div>

                    {/* QR Code Display */}
                    {selectedMethod.qr_code_url && (
                      <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 text-center">Quét mã QR để thanh toán</div>
                        <div className="bg-white p-4 rounded-lg flex items-center justify-center border border-gray-200 dark:border-white/10">
                          <img
                            src={(() => {
                              // Generate dynamic QR with amount and description
                              const baseUrl = selectedMethod.qr_code_url.split('?')[0];
                              const params = new URLSearchParams();
                              params.append('accountName', selectedMethod.account_name);
                              if (plan.price && plan.price > 0) {
                                params.append('amount', plan.price.toString());
                              }
                              if (transferContent) {
                                params.append('addInfo', transferContent);
                              }
                              return `${baseUrl}?${params.toString()}`;
                            })()}
                            alt="QR Code thanh toán"
                            className="w-64 h-64 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                          Mở app ngân hàng và quét mã QR này để thanh toán
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Upload ảnh chuyển khoản</h3>
                
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="proof-upload"
                    />
                    <label htmlFor="proof-upload" className="cursor-pointer">
                      {proofPreview ? (
                        <div className="relative w-full h-48">
                          <Image
                            src={proofPreview}
                            alt="Proof"
                            fill
                            className="object-contain rounded"
                          />
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                          <div className="text-sm text-gray-400">Click để chọn ảnh</div>
                        </div>
                      )}
                    </label>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!proofImage || uploading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                  >
                    {uploading ? "Đang gửi..." : "Xác nhận thanh toán"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <CheckoutContent />
    </Suspense>
  );
}

