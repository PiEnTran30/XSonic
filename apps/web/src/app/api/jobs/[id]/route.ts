import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { QueueAdapter } from "@xsonic/core";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const queue = new QueueAdapter(
      process.env.UPSTASH_REDIS_REST_URL!,
      process.env.UPSTASH_REDIS_REST_TOKEN!
    );

    const job = await queue.getJob(params.id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Job not found" } },
        { status: 404 }
      );
    }

    if (job.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        progress_message: job.progress_message,
        output_files: job.output_files,
        error_message: job.error_message,
        cost_actual: job.cost_actual,
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
      },
    });
  } catch (error: any) {
    console.error("Get job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Failed to get job",
        },
      },
      { status: 500 }
    );
  }
}

