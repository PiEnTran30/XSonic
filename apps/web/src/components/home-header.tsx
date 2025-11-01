"use client";

import Link from "next/link";
import { Zap, CreditCard, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function HomeHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <header className="border-b border-white/10 backdrop-blur-sm bg-[#0F172A]/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl md:text-2xl">🎵</span>
          <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            X-Sonic
          </span>
        </Link>
        <nav className="flex items-center gap-2 md:gap-6">
          <Link
            href="/tools"
            className="text-xs md:text-sm font-medium hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            <Zap className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Công cụ</span>
          </Link>
          <Link
            href="/pricing"
            className="text-xs md:text-sm font-medium hover:text-blue-400 transition-colors flex items-center gap-1"
          >
            <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Giá</span>
          </Link>
          <ThemeToggle />

          {!loading && (
            <>
              {user ? (
                // Logged in - show dashboard link and logout
                <>
                  <Link
                    href="/dashboard"
                    className="text-xs md:text-sm font-medium hover:text-blue-400 transition-colors hidden sm:block"
                  >
                    Dashboard
                  </Link>
                  <form action="/api/auth/signout" method="post">
                    <button className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs md:text-sm font-medium">
                      <LogOut className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Đăng xuất</span>
                    </button>
                  </form>
                </>
              ) : (
                // Not logged in - show login/signup
                <>
                  <Link
                    href="/login"
                    className="text-xs md:text-sm font-medium hover:text-blue-400 transition-colors"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/login"
                    className="px-3 md:px-6 py-1.5 md:py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-xs md:text-sm font-bold transition-all transform hover:scale-105 shadow-lg shadow-blue-500/30"
                  >
                    <span className="hidden sm:inline">Dùng thử miễn phí</span>
                    <span className="sm:hidden">Start</span>
                  </Link>
                </>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

