import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BillingAdapter } from "@xsonic/core";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const billing = new BillingAdapter(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const wallet = await billing.getOrCreateWallet(user.id);

    return NextResponse.json({
      success: true,
      data: {
        balance_credits: wallet.balance_credits,
        reserved_credits: wallet.reserved_credits,
        available_credits: wallet.balance_credits - wallet.reserved_credits,
      },
    });
  } catch (error: any) {
    console.error("Get wallet error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Failed to get wallet",
        },
      },
      { status: 500 }
    );
  }
}

