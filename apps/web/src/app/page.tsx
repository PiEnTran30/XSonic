import Link from "next/link";
import { Sparkles, Music, Video, ArrowRight, Zap, CreditCard, Shield } from "lucide-react";
import { HomeHeader } from "@/components/home-header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      <HomeHeader />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full mb-6">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">AI-Powered Studio</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Audio & Video Studio
            </span>
            <br />
            <span className="text-white">trong trình duyệt</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            Xử lý audio chuyên nghiệp, chỉnh sửa video và AI tools.
            <span className="text-blue-400 font-semibold"> Không cần cài đặt</span>,
            chạy ngay trên browser.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/tools"
              className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-2xl shadow-blue-500/50 flex items-center gap-3"
            >
              <Zap className="h-5 w-5" />
              Dùng thử miễn phí ngay
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/40 rounded-xl font-semibold text-lg transition-all flex items-center gap-2"
            >
              <CreditCard className="h-5 w-5" />
              Xem bảng giá
            </Link>
          </div>

          {/* Quick Access Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Link
              href="/tools?category=ai-audio"
              className="group p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 rounded-2xl border border-blue-500/30 hover:border-blue-500/60 transition-all"
            >
              <Sparkles className="h-8 w-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-lg font-bold mb-1">AI Audio</div>
              <div className="text-sm text-gray-400">5 công cụ AI</div>
            </Link>

            <Link
              href="/tools?category=audio-basic"
              className="group p-6 bg-gradient-to-br from-green-500/10 to-teal-500/10 hover:from-green-500/20 hover:to-teal-500/20 rounded-2xl border border-green-500/30 hover:border-green-500/60 transition-all"
            >
              <Music className="h-8 w-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-lg font-bold mb-1">Audio Basic</div>
              <div className="text-sm text-gray-400">4 công cụ cơ bản</div>
            </Link>

            <Link
              href="/tools?category=video"
              className="group p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 rounded-2xl border border-purple-500/30 hover:border-purple-500/60 transition-all"
            >
              <Video className="h-8 w-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-lg font-bold mb-1">Video Tools</div>
              <div className="text-sm text-gray-400">1 công cụ video</div>
            </Link>
          </div>
        </div>
      </section>

      {/* Tools Showcase */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              10 Công cụ mạnh mẽ
            </span>
          </h2>
          <p className="text-xl text-gray-400">Xử lý audio/video chuyên nghiệp với AI</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* AI Audio Tools */}
          <Link
            href="/tools?category=ai-audio"
            className="group p-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 rounded-2xl border border-blue-500/30 hover:border-blue-500/60 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Sparkles className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">AI Audio</h3>
                <p className="text-sm text-gray-400">5 công cụ AI</p>
              </div>
            </div>
            <ul className="text-gray-300 space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">✓</span>
                <span><strong>Stem Splitter</strong> - Tách nhạc thành vocals, drums, bass</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">✓</span>
                <span><strong>Audio Enhance</strong> - Nâng cao chất lượng âm thanh</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">✓</span>
                <span><strong>De-Reverb</strong> - Khử tiếng vang, echo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">✓</span>
                <span><strong>Auto Subtitle</strong> - Tự động tạo phụ đề</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">✓</span>
                <span><strong>Text-to-Speech</strong> - Chuyển văn bản thành giọng nói</span>
              </li>
            </ul>
            <div className="flex items-center gap-2 text-blue-400 font-bold group-hover:gap-3 transition-all">
              Khám phá ngay
              <ArrowRight className="h-5 w-5" />
            </div>
          </Link>

          {/* Basic Audio Tools */}
          <Link
            href="/tools?category=audio-basic"
            className="group p-8 bg-gradient-to-br from-green-500/10 to-teal-500/10 hover:from-green-500/20 hover:to-teal-500/20 rounded-2xl border border-green-500/30 hover:border-green-500/60 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Music className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Audio Basic</h3>
                <p className="text-sm text-gray-400">4 công cụ cơ bản</p>
              </div>
            </div>
            <ul className="text-gray-300 space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">✓</span>
                <span><strong>Cut & Join</strong> - Cắt ghép audio dễ dàng</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">✓</span>
                <span><strong>Pitch & Tempo</strong> - Điều chỉnh cao độ, tốc độ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">✓</span>
                <span><strong>Volume & Normalize</strong> - Điều chỉnh âm lượng</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">✓</span>
                <span><strong>Online Recorder</strong> - Ghi âm trực tuyến</span>
              </li>
            </ul>
            <div className="flex items-center gap-2 text-green-400 font-bold group-hover:gap-3 transition-all">
              Khám phá ngay
              <ArrowRight className="h-5 w-5" />
            </div>
          </Link>

          {/* Video Tools */}
          <Link
            href="/tools?category=video"
            className="group p-8 bg-gradient-to-br from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 rounded-2xl border border-purple-500/30 hover:border-purple-500/60 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-500/20 rounded-xl group-hover:scale-110 transition-transform">
                <Video className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Video Tools</h3>
                <p className="text-sm text-gray-400">1 công cụ video</p>
              </div>
            </div>
            <ul className="text-gray-300 space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">✓</span>
                <span><strong>Video Downloader</strong> - Tải video từ mọi nguồn</span>
              </li>
              <li className="flex items-start gap-2 opacity-50">
                <span className="text-gray-500 mt-1">○</span>
                <span className="text-gray-500"><strong>Video Editor</strong> - Sắp ra mắt</span>
              </li>
            </ul>
            <div className="flex items-center gap-2 text-purple-400 font-bold group-hover:gap-3 transition-all">
              Khám phá ngay
              <ArrowRight className="h-5 w-5" />
            </div>
          </Link>
        </div>

        {/* CTA Button */}
        <div className="text-center mt-12">
          <Link
            href="/tools"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl shadow-blue-500/30"
          >
            <Zap className="h-5 w-5" />
            Xem tất cả công cụ
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Tại sao chọn <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">X-Sonic</span>?
          </h2>
          <p className="text-xl text-gray-400">Nền tảng xử lý audio/video mạnh mẽ nhất</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="group p-8 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20 rounded-2xl border border-yellow-500/30 hover:border-yellow-500/60 transition-all">
            <div className="p-4 bg-yellow-500/20 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
              <Zap className="h-10 w-10 text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">GPU Acceleration</h3>
            <p className="text-gray-300 leading-relaxed">
              Auto-scaling GPU workers tự động bật khi cần. Xử lý nhanh gấp 10x so với CPU thường.
            </p>
          </div>

          <div className="group p-8 bg-gradient-to-br from-green-500/10 to-teal-500/10 hover:from-green-500/20 hover:to-teal-500/20 rounded-2xl border border-green-500/30 hover:border-green-500/60 transition-all">
            <div className="p-4 bg-green-500/20 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
              <Shield className="h-10 w-10 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Bảo mật & Riêng tư</h3>
            <p className="text-gray-300 leading-relaxed">
              Files được mã hóa end-to-end. Tự động xóa sau khi xử lý xong. 100% private.
            </p>
          </div>

          <div className="group p-8 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 rounded-2xl border border-blue-500/30 hover:border-blue-500/60 transition-all">
            <div className="p-4 bg-blue-500/20 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
              <CreditCard className="h-10 w-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Trả theo sử dụng</h3>
            <p className="text-gray-300 leading-relaxed">
              Chỉ trả tiền cho những gì bạn dùng. Không cam kết dài hạn. Hủy bất cứ lúc nào.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center p-12 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl border border-blue-500/30">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Sẵn sàng bắt đầu?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Đăng ký miễn phí ngay hôm nay. Nhận <span className="text-blue-400 font-bold">100 credits</span> để dùng thử tất cả công cụ.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="group px-10 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-2xl shadow-blue-500/50 flex items-center justify-center gap-3"
            >
              Đăng ký miễn phí
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/pricing"
              className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/40 rounded-xl font-semibold text-lg transition-all"
            >
              Xem bảng giá
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p>&copy; 2024 X-Sonic. All rights reserved.</p>
          <div className="flex gap-6 justify-center mt-4">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

