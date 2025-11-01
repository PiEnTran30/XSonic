import { createClient } from "@/lib/supabase/server";
import { Wrench, Clock, Zap, RefreshCw } from "lucide-react";

export default async function MaintenancePage() {
  const supabase = createClient();

  // Get maintenance message
  const { data: maintenanceSetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "maintenance_mode")
    .single();

  const message = maintenanceSetting?.value?.message || "Hệ thống đang bảo trì. Vui lòng quay lại sau.";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Circles */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

        {/* Animated Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
      </div>

      <div className="max-w-3xl w-full text-center relative z-10">
        {/* Animated Icon */}
        <div className="mb-8 flex justify-center relative">
          {/* Rotating Ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 border-4 border-yellow-500/20 rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 border-4 border-blue-500/20 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
          </div>

          {/* Center Icon */}
          <div className="relative p-8 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full border-2 border-yellow-500/30 backdrop-blur-sm animate-bounce" style={{ animationDuration: '2s' }}>
            <Wrench className="h-16 w-16 text-yellow-400 animate-pulse" />
          </div>
        </div>

        {/* Title with Gradient Animation */}
        <h1 className="text-5xl md:text-7xl font-black mb-6 pb-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient_3s_ease_infinite]" style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }}>
          Đang Bảo Trì
        </h1>

        {/* Subtitle */}
        <div className="mb-8 flex items-center justify-center gap-2 text-gray-400">
          <RefreshCw className="h-5 w-5 animate-spin" style={{ animationDuration: '2s' }} />
          <p className="text-lg font-medium">
            Hệ thống đang được nâng cấp
          </p>
        </div>

        {/* Message Card */}
        <div className="mb-10 p-8 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl backdrop-blur-md shadow-2xl transform hover:scale-105 transition-transform duration-300">
          <p className="text-xl md:text-2xl text-gray-200 leading-relaxed font-light">
            {message}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl backdrop-blur-sm hover:bg-blue-500/20 transition-colors">
            <Zap className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-blue-300 font-medium">Tối ưu hiệu suất</p>
          </div>
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl backdrop-blur-sm hover:bg-purple-500/20 transition-colors">
            <RefreshCw className="h-8 w-8 text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-purple-300 font-medium">Cập nhật tính năng</p>
          </div>
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl backdrop-blur-sm hover:bg-green-500/20 transition-colors">
            <Clock className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-green-300 font-medium">Sớm hoàn thành</p>
          </div>
        </div>

        {/* Time Info */}
        <div className="flex items-center justify-center gap-3 text-gray-400">
          <Clock className="h-5 w-5 animate-pulse" />
          <p className="text-base">
            Chúng tôi sẽ quay lại sớm nhất có thể
          </p>
        </div>

        {/* Animated Dots */}
        <div className="mt-12 flex justify-center gap-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}

