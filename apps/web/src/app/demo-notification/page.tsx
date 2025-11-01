"use client";

import { NotificationModal } from "@/components/ui/notification-modal";
import { useNotification } from "@/hooks/useNotification";
import { Bell, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export default function DemoNotificationPage() {
  const {
    notification,
    closeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
  } = useNotification();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bell className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold">Notification Modal Demo</h1>
          </div>
          <p className="text-gray-400">
            Test các loại notification modal với animations và auto-close
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Success */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <h2 className="text-xl font-bold">Success</h2>
            </div>
            <p className="text-gray-400 mb-4 text-sm">
              Hiển thị thông báo thành công với icon xanh
            </p>
            <button
              onClick={() =>
                showSuccess(
                  "Thành công!",
                  "Thao tác của bạn đã được thực hiện thành công.",
                  3000
                )
              }
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              Show Success
            </button>
          </div>

          {/* Error */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <h2 className="text-xl font-bold">Error</h2>
            </div>
            <p className="text-gray-400 mb-4 text-sm">
              Hiển thị thông báo lỗi với icon đỏ
            </p>
            <button
              onClick={() =>
                showError(
                  "Lỗi!",
                  "Đã xảy ra lỗi khi thực hiện thao tác.\nVui lòng thử lại sau."
                )
              }
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Show Error
            </button>
          </div>

          {/* Warning */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
              <h2 className="text-xl font-bold">Warning</h2>
            </div>
            <p className="text-gray-400 mb-4 text-sm">
              Hiển thị cảnh báo với icon vàng
            </p>
            <button
              onClick={() =>
                showWarning(
                  "Cảnh báo!",
                  "Hành động này có thể ảnh hưởng đến dữ liệu của bạn."
                )
              }
              className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
            >
              Show Warning
            </button>
          </div>

          {/* Info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Info className="h-6 w-6 text-blue-400" />
              <h2 className="text-xl font-bold">Info</h2>
            </div>
            <p className="text-gray-400 mb-4 text-sm">
              Hiển thị thông tin với icon xanh dương
            </p>
            <button
              onClick={() =>
                showInfo(
                  "Thông tin",
                  "Đây là một thông báo thông tin quan trọng.",
                  5000
                )
              }
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Show Info (Auto-close 5s)
            </button>
          </div>

          {/* Confirm Dialog */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
              <h2 className="text-xl font-bold">Confirm Dialog</h2>
            </div>
            <p className="text-gray-400 mb-4 text-sm">
              Hiển thị dialog xác nhận với 2 nút: Xác nhận và Hủy
            </p>
            <button
              onClick={() =>
                showConfirm(
                  "Xác nhận xóa",
                  "Bạn có chắc chắn muốn xóa mục này?\nHành động này không thể hoàn tác.",
                  () => {
                    showSuccess("Đã xóa!", "Mục đã được xóa thành công.", 2000);
                  },
                  "Xóa",
                  "Hủy"
                )
              }
              className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
            >
              Show Confirm Dialog
            </button>
          </div>
        </div>

        {/* Usage Example */}
        <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">📝 Cách sử dụng</h2>
          <div className="space-y-4 text-sm">
            <div className="bg-black/30 rounded-lg p-4 font-mono">
              <div className="text-gray-400 mb-2">// Import hook</div>
              <div className="text-blue-400">import</div>{" "}
              <div className="text-yellow-400 inline">{"{ useNotification }"}</div>{" "}
              <div className="text-blue-400 inline">from</div>{" "}
              <div className="text-green-400 inline">"@/hooks/useNotification"</div>;
            </div>

            <div className="bg-black/30 rounded-lg p-4 font-mono">
              <div className="text-gray-400 mb-2">// Sử dụng trong component</div>
              <div className="text-blue-400">const</div>{" "}
              <div className="text-yellow-400 inline">
                {"{ notification, closeNotification, showSuccess, showError }"}
              </div>{" "}
              <div className="text-blue-400 inline">=</div>{" "}
              <div className="text-purple-400 inline">useNotification</div>();
            </div>

            <div className="bg-black/30 rounded-lg p-4 font-mono">
              <div className="text-gray-400 mb-2">// Hiển thị notification</div>
              <div className="text-purple-400">showSuccess</div>
              <div className="text-white inline">(</div>
              <div className="text-green-400 inline">"Thành công!"</div>
              <div className="text-white inline">, </div>
              <div className="text-green-400 inline">"Đã lưu thành công"</div>
              <div className="text-white inline">, </div>
              <div className="text-orange-400 inline">3000</div>
              <div className="text-white inline">);</div>
            </div>

            <div className="bg-black/30 rounded-lg p-4 font-mono">
              <div className="text-gray-400 mb-2">// Thêm NotificationModal vào JSX</div>
              <div className="text-gray-500">{"<"}</div>
              <div className="text-blue-400 inline">NotificationModal</div>
              <br />
              <div className="ml-4 text-purple-400 inline">isOpen</div>
              <div className="text-white inline">=</div>
              <div className="text-yellow-400 inline">{"{notification.isOpen}"}</div>
              <br />
              <div className="ml-4 text-purple-400 inline">onClose</div>
              <div className="text-white inline">=</div>
              <div className="text-yellow-400 inline">{"{closeNotification}"}</div>
              <br />
              <div className="ml-4 text-purple-400 inline">{"...notification"}</div>
              <br />
              <div className="text-gray-500">{"/>"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        confirmText={notification.confirmText}
        cancelText={notification.cancelText}
        onConfirm={notification.onConfirm}
        showCancel={notification.showCancel}
        autoClose={notification.autoClose}
      />
    </div>
  );
}

