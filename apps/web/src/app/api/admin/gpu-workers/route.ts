import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/gpu-workers - List all GPU workers
export async function GET() {
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

    // Fetch all GPU workers
    const { data: workers, error } = await supabase
      .from("gpu_workers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/gpu-workers - Create new GPU worker
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const {
      name,
      provider,
      host,
      port,
      ssh_port,
      web_terminal_port,
      gpu_model,
      gpu_count,
      cpu_cores,
      ram_gb,
      storage_gb,
      provider_id,
      provider_metadata,
      price_per_hour,
      currency,
      auto_start,
      auto_stop,
      auto_stop_idle_minutes,
      rented_until,
    } = body;

    // Validate required fields
    if (!name || !provider || !host || !port) {
      return NextResponse.json(
        { error: "Missing required fields: name, provider, host, port" },
        { status: 400 }
      );
    }

    // Insert GPU worker
    const { data: worker, error } = await supabase
      .from("gpu_workers")
      .insert({
        name,
        provider,
        host,
        port,
        ssh_port,
        web_terminal_port,
        gpu_model,
        gpu_count,
        cpu_cores,
        ram_gb,
        storage_gb,
        provider_id,
        provider_metadata,
        price_per_hour,
        currency,
        auto_start,
        auto_stop,
        auto_stop_idle_minutes,
        rented_until,
        status: "stopped",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ worker }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

