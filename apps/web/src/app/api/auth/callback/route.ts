import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.user) {
      // Check if user exists in database
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", data.user.id)
        .single();

      // If user doesn't exist, create user record
      if (!existingUser) {
        await supabase.from("users").insert({
          id: data.user.id,
          email: data.user.email,
          role: "user",
          metadata: {
            full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || "",
          },
        });

        // Create wallet
        await supabase.from("wallets").insert({
          user_id: data.user.id,
          balance_credits: 0,
          reserved_credits: 0,
        });
      }

      // Check user role and redirect accordingly
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (userData?.role === "admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}

