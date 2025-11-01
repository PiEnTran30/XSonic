import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Check, Zap, Crown, Rocket, Building2 } from "lucide-react";

export default async function PricingPage() {
  const supabase = createClient();

  // Fetch plans from database
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order");

  // Fetch tool costs
  const { data: toolCosts } = await supabase
    .from("tool_costs")
    .select("*")
    .eq("is_active", true)
    .order("category, credits_per_minute", { ascending: false });

  const planIcons = {
    free: Zap,
    starter: Rocket,
    pro: Crown,
    enterprise: Building2,
  };

  const planColors = {
    free: "from-gray-500/20 to-gray-600/20 border-gray-500/30",
    starter: "from-blue-500/20 to-blue-600/20 border-blue-500/50",
    pro: "from-purple-500/20 to-purple-600/20 border-purple-500/50",
    enterprise: "from-orange-500/20 to-orange-600/20 border-orange-500/50",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              X-Sonic
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/tools" className="text-gray-300 hover:text-white transition-colors">
                Tools
              </Link>
              <Link href="/pricing" className="text-white">
                Pricing
              </Link>
              <Link href="/login" className="text-gray-300 hover:text-white transition-colors">
                Login
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg font-medium transition-all"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Giá cả đơn giản, minh bạch
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Chọn gói phù hợp với nhu cầu của bạn. Nâng cấp hoặc hạ cấp bất cứ lúc nào.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <Zap className="h-4 w-4 text-yellow-400" />
            <span className="text-sm">Tất cả gói đều có 7 ngày dùng thử miễn phí</span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto mb-16">
          {plans?.map((plan: any) => {
            const Icon = planIcons[plan.slug as keyof typeof planIcons] || Zap;
            const colorClass = planColors[plan.slug as keyof typeof planColors] || planColors.free;
            const isPopular = plan.slug === "starter";

            return (
              <div
                key={plan.id}
                className={`relative p-8 bg-gradient-to-br ${colorClass} rounded-2xl border transition-all hover:scale-105`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-sm font-bold">
                    Phổ biến nhất
                  </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-white/10 rounded-lg">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{plan.price_monthly.toLocaleString('vi-VN')}</span>
                    <span className="text-gray-400">₫/tháng</span>
                  </div>
                  {plan.price_yearly > 0 && (
                    <div className="text-sm text-gray-400 mt-1">
                      hoặc {plan.price_yearly.toLocaleString('vi-VN')}₫/năm (tiết kiệm {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%)
                    </div>
                  )}
                </div>

                <p className="text-gray-300 mb-6">{plan.description}</p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    <span className="font-bold">{plan.credits_monthly.toLocaleString()}</span>
                    <span className="text-gray-400">credits/tháng</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="h-4 w-4 text-green-400" />
                    <span>Max {plan.limits.max_file_size_mb}MB file</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="h-4 w-4 text-green-400" />
                    <span>{plan.limits.max_storage_gb}GB storage</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="h-4 w-4 text-green-400" />
                    <span>{plan.limits.max_concurrent_jobs} jobs đồng thời</span>
                  </div>
                  {plan.features.ai_audio && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="h-4 w-4 text-green-400" />
                      <span>AI Audio Tools</span>
                    </div>
                  )}
                  {plan.features.video_tools && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="h-4 w-4 text-green-400" />
                      <span>Video Tools</span>
                    </div>
                  )}
                  {plan.features.priority_queue && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="h-4 w-4 text-green-400" />
                      <span>Priority Queue</span>
                    </div>
                  )}
                  {plan.features.gpu_access && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="h-4 w-4 text-green-400" />
                      <span>GPU Access</span>
                    </div>
                  )}
                  {plan.features.api_access && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="h-4 w-4 text-green-400" />
                      <span>API Access</span>
                    </div>
                  )}
                </div>

                <Link
                  href={plan.slug === "free" ? "/signup" : `/checkout?plan=${plan.id}`}
                  className={`block w-full px-6 py-3 rounded-lg font-bold text-center transition-all ${
                    isPopular
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  {plan.slug === "free" ? "Bắt đầu miễn phí" : "Mua ngay"}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Tool Costs Table */}
        <div className="max-w-6xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">Bảng giá Credits theo công cụ</h2>
          <p className="text-center text-gray-400 mb-8">
            Mỗi công cụ tiêu tốn credits khác nhau. Giá = Base Credits + (Credits/phút × Thời lượng)
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* AI Audio Tools */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-3xl">✨</span>
                AI Audio Tools
              </h3>
              <div className="space-y-3">
                {toolCosts?.filter((t: any) => t.category === 'ai-audio').map((tool: any) => (
                  <div key={tool.id} className="p-3 bg-white/5 rounded-lg">
                    <div className="font-medium mb-1">{tool.tool_name}</div>
                    <div className="text-sm text-gray-400 mb-2">{tool.description}</div>
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Zap className="h-4 w-4" />
                      <span className="font-bold">{tool.base_credits}</span>
                      <span className="text-xs">base</span>
                      <span className="text-gray-500">+</span>
                      <span className="font-bold">{tool.credits_per_minute}</span>
                      <span className="text-xs">/phút</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Basic Audio Tools */}
            <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-3xl">🎵</span>
                Basic Audio Tools
              </h3>
              <div className="space-y-3">
                {toolCosts?.filter((t: any) => t.category === 'audio-basic').map((tool: any) => (
                  <div key={tool.id} className="p-3 bg-white/5 rounded-lg">
                    <div className="font-medium mb-1">{tool.tool_name}</div>
                    <div className="text-sm text-gray-400 mb-2">{tool.description}</div>
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Zap className="h-4 w-4" />
                      <span className="font-bold">{tool.base_credits}</span>
                      <span className="text-xs">base</span>
                      <span className="text-gray-500">+</span>
                      <span className="font-bold">{tool.credits_per_minute}</span>
                      <span className="text-xs">/phút</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Tools */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-3xl">🎬</span>
                Video Tools
              </h3>
              <div className="space-y-3">
                {toolCosts?.filter((t: any) => t.category === 'video').map((tool: any) => (
                  <div key={tool.id} className="p-3 bg-white/5 rounded-lg">
                    <div className="font-medium mb-1">{tool.tool_name}</div>
                    <div className="text-sm text-gray-400 mb-2">{tool.description}</div>
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Zap className="h-4 w-4" />
                      <span className="font-bold">{tool.base_credits}</span>
                      <span className="text-xs">base</span>
                      <span className="text-gray-500">+</span>
                      <span className="font-bold">{tool.credits_per_minute}</span>
                      <span className="text-xs">/phút</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Example Calculation */}
          <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <h4 className="font-bold mb-2">💡 Ví dụ tính toán:</h4>
            <p className="text-gray-300">
              Stem Splitter cho file audio 3 phút: <span className="text-yellow-400 font-bold">5</span> (base) +
              <span className="text-yellow-400 font-bold"> 10</span> × 3 (phút) =
              <span className="text-yellow-400 font-bold text-xl"> 35 credits</span>
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Câu hỏi thường gặp</h2>
          <div className="space-y-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold mb-2">Credits là gì?</h3>
              <p className="text-gray-400">
                Credits là đơn vị tính phí cho mỗi công cụ. Mỗi công cụ tiêu tốn số credits khác nhau tùy vào độ phức tạp và thời gian xử lý.
              </p>
            </div>
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold mb-2">Tôi có thể hủy bất cứ lúc nào không?</h3>
              <p className="text-gray-400">
                Có! Bạn có thể hủy subscription bất cứ lúc nào. Bạn vẫn có thể sử dụng đến hết chu kỳ thanh toán hiện tại.
              </p>
            </div>
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold mb-2">Credits có hết hạn không?</h3>
              <p className="text-gray-400">
                Credits được reset mỗi tháng. Credits không sử dụng hết sẽ không được chuyển sang tháng sau.
              </p>
            </div>
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-xl font-bold mb-2">Tôi có thể nâng cấp/hạ cấp không?</h3>
              <p className="text-gray-400">
                Có! Bạn có thể nâng cấp hoặc hạ cấp bất cứ lúc nào. Thay đổi sẽ có hiệu lực ngay lập tức.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold mb-4">Sẵn sàng bắt đầu?</h2>
          <p className="text-gray-400 mb-8">Dùng thử miễn phí 7 ngày, không cần thẻ tín dụng</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl font-bold text-lg transition-all transform hover:scale-105"
          >
            <Rocket className="h-5 w-5" />
            Bắt đầu ngay
          </Link>
        </div>
      </main>
    </div>
  );
}

