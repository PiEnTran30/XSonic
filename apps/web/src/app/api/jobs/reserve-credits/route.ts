import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BillingAdapter } from "@xsonic/core";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { toolId, estimatedCredits } = body;

    if (!toolId || estimatedCredits === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing toolId or estimatedCredits" },
        { status: 400 }
      );
    }

    // Get tool cost info
    const { data: toolCost, error: toolError } = await supabase
      .from("tool_costs")
      .select("*")
      .eq("tool_id", toolId)
      .single();

    if (toolError || !toolCost) {
      return NextResponse.json(
        { success: false, error: "Tool not found" },
        { status: 404 }
      );
    }

    // Get user wallet
    const billing = new BillingAdapter(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const wallet = await billing.getOrCreateWallet(user.id);

    // Calculate actual credits needed
    const creditsNeeded = Math.max(toolCost.base_credits, estimatedCredits);

    // Check if user has enough credits
    const availableCredits = wallet.balance_credits - wallet.reserved_credits;
    if (availableCredits < creditsNeeded) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient credits",
          required: creditsNeeded,
          available: availableCredits,
        },
        { status: 402 }
      );
    }

    // Reserve credits
    const reserved = await billing.reserveCredits(user.id, creditsNeeded);

    if (!reserved) {
      return NextResponse.json(
        { success: false, error: "Failed to reserve credits" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      creditsReserved: creditsNeeded,
      remainingCredits: availableCredits - creditsNeeded,
    });
  } catch (error: any) {
    console.error("Reserve credits error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

