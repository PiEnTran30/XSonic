import { NextRequest, NextResponse } from "next/server";
import { BillingAdapter } from "@xsonic/core";

export async function GET(request: NextRequest) {
  try {
    const billing = new BillingAdapter(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const plans = await billing.getActivePlans();

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    console.error("Get plans error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Failed to get plans",
        },
      },
      { status: 500 }
    );
  }
}

