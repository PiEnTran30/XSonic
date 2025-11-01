import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/admin/gpu-workers/[id]/heartbeat - Worker heartbeat (called by GPU worker)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Use service role key for worker authentication
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await request.json();
    const { status, metadata } = body;

    // Update worker heartbeat and status
    const { data: worker, error } = await supabase
      .from("gpu_workers")
      .update({
        last_heartbeat: new Date().toISOString(),
        status: status || "running",
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    // Log heartbeat if there's important metadata
    if (metadata && Object.keys(metadata).length > 0) {
      await supabase.from("gpu_worker_logs").insert({
        worker_id: params.id,
        level: "info",
        message: "Heartbeat received",
        metadata,
      });
    }

    return NextResponse.json({ success: true, worker });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

