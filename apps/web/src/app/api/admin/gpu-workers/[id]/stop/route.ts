import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/admin/gpu-workers/[id]/stop - Stop GPU worker
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get worker
    const { data: worker, error: fetchError } = await supabase
      .from("gpu_workers")
      .select("*")
      .eq("id", params.id)
      .single();

    if (fetchError || !worker) {
      return NextResponse.json(
        { error: "Worker not found" },
        { status: 404 }
      );
    }

    // Check if already stopped
    if (worker.status === "stopped") {
      return NextResponse.json(
        { error: "Worker is already stopped" },
        { status: 400 }
      );
    }

    // Update status to stopping
    const { data: updatedWorker, error: updateError } = await supabase
      .from("gpu_workers")
      .update({
        status: "stopping",
        stopped_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Log the action
    await supabase.from("gpu_worker_logs").insert({
      worker_id: params.id,
      level: "info",
      message: `Worker stop requested by admin ${user.email}`,
      metadata: { admin_id: user.id },
    });

    // TODO: Implement actual stop logic based on provider
    // For ckey.vn, you might need to call their API or SSH to shutdown
    // For now, we'll just update the status

    return NextResponse.json({
      worker: updatedWorker,
      message: "Worker stop initiated. Please check the worker status.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

