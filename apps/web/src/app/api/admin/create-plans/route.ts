import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY not set" },
        { status: 500 }
      );
    }

    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const plans = [
      {
        id: "free",
        name: "Free",
        slug: "free",
        description: "Gói miễn phí cho người dùng mới",
        price_monthly: 0,
        price_yearly: 0,
        credits_monthly: 100,
        features: ["100 credits/tháng", "Truy cập các công cụ cơ bản", "Hỗ trợ qua email"],
        limits: {},
        is_active: true,
        is_visible: true,
        sort_order: 1,
      },
      {
        id: "basic",
        name: "Basic",
        slug: "basic",
        description: "Gói cơ bản cho người dùng thường xuyên",
        price_monthly: 99000,
        price_yearly: 990000,
        credits_monthly: 1000,
        features: ["1,000 credits/tháng", "Tất cả công cụ", "Hỗ trợ ưu tiên", "Lưu trữ 10GB"],
        limits: {},
        is_active: true,
        is_visible: true,
        sort_order: 2,
      },
      {
        id: "pro",
        name: "Pro",
        slug: "pro",
        description: "Gói chuyên nghiệp cho power users",
        price_monthly: 299000,
        price_yearly: 2990000,
        credits_monthly: 5000,
        features: ["5,000 credits/tháng", "Tất cả công cụ", "Hỗ trợ 24/7", "Lưu trữ 50GB", "API access"],
        limits: {},
        is_active: true,
        is_visible: true,
        sort_order: 3,
      },
      {
        id: "enterprise",
        name: "Enterprise",
        slug: "enterprise",
        description: "Gói doanh nghiệp với credits không giới hạn",
        price_monthly: 999000,
        price_yearly: 9990000,
        credits_monthly: 999999,
        features: ["Credits không giới hạn", "Tất cả công cụ", "Hỗ trợ dedicated", "Lưu trữ unlimited", "API access", "Custom integration"],
        limits: {},
        is_active: true,
        is_visible: true,
        sort_order: 4,
      },
    ];

    const results = [];

    for (const plan of plans) {
      const { data, error } = await supabase
        .from("plans")
        .upsert(plan, { onConflict: "id" })
        .select()
        .single();

      if (error) {
        results.push({ plan: plan.id, success: false, error: error.message });
      } else {
        results.push({ plan: plan.id, success: true });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("Create plans error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create plans" },
      { status: 500 }
    );
  }
}

