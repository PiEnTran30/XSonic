import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BillingAdapter } from "@xsonic/core";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, actualCredits } = body;

    if (!jobId || actualCredits === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing jobId or actualCredits" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    // Get billing adapter
    const billing = new BillingAdapter(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Deduct credits
    const transaction = await billing.deductCredits(
      job.user_id,
      actualCredits,
      `Job ${jobId} - ${job.tool_id}`,
      "job",
      jobId
    );

    // Update job with actual cost
    await supabase
      .from("jobs")
      .update({ cost_actual: actualCredits })
      .eq("id", jobId);

    return NextResponse.json({
      success: true,
      creditsDeducted: actualCredits,
      transactionId: transaction.id,
    });
  } catch (error: any) {
    console.error("Deduct credits error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

