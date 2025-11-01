"use client";

import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#0F172A] dark:to-[#1E293B] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="mb-8">
          <div className="relative inline-block">
            <h1 className="text-[150px] md:text-[200px] font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent leading-none">
              404
            </h1>
            <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-blue-500/20 to-purple-600/20 -z-10"></div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
            Trang không tồn tại
          </h2>
          <p className="text-lg text-slate-600 dark:text-gray-400 mb-2">
            Rất tiếc, chúng tôi không thể tìm thấy trang bạn đang tìm kiếm.
          </p>
          <p className="text-slate-500 dark:text-gray-500">
            Trang có thể đã bị xóa, đổi tên hoặc tạm thời không khả dụng.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg"
          >
            <Home className="h-5 w-5" />
            Về trang chủ
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl font-semibold transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
            Quay lại Dashboard
          </Link>
        </div>

        <div className="mt-12 p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
          <div className="flex items-center gap-2 mb-4 text-slate-900 dark:text-white">
            <Search className="h-5 w-5" />
            <h3 className="font-semibold">Có thể bạn đang tìm:</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-left">
            <Link
              href="/tools"
              className="p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-colors"
            >
              <div className="font-medium text-slate-900 dark:text-white">🎵 Công cụ</div>
              <div className="text-sm text-slate-600 dark:text-gray-400">Xử lý audio/video</div>
            </Link>
            <Link
              href="/pricing"
              className="p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-colors"
            >
              <div className="font-medium text-slate-900 dark:text-white">💳 Bảng giá</div>
              <div className="text-sm text-slate-600 dark:text-gray-400">Xem các gói dịch vụ</div>
            </Link>
            <Link
              href="/dashboard/settings"
              className="p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-colors"
            >
              <div className="font-medium text-slate-900 dark:text-white">⚙️ Cài đặt</div>
              <div className="text-sm text-slate-600 dark:text-gray-400">Quản lý tài khoản</div>
            </Link>
            <Link
              href="/admin"
              className="p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-colors"
            >
              <div className="font-medium text-slate-900 dark:text-white">👑 Admin</div>
              <div className="text-sm text-slate-600 dark:text-gray-400">Quản trị hệ thống</div>
            </Link>
          </div>
        </div>

        <div className="mt-8 text-sm text-slate-500 dark:text-gray-500">
          Nếu bạn cho rằng đây là lỗi, vui lòng{" "}
          <a href="mailto:support@xsonic.com" className="text-blue-500 hover:text-blue-600 underline">
            liên hệ hỗ trợ
          </a>
        </div>
      </div>
    </div>
  );
}

