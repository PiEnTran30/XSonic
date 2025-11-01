import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/tools/status
 * Returns the enabled/disabled status and coming soon status for all tools
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get tools_enabled setting
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "tools_enabled")
      .single();

    if (error) {
      console.error("Error fetching tool status:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tools: data?.value || {},
    });
  } catch (error: any) {
    console.error("Tool status error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tools/status
 * Update tool status (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden - Admin only" },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { toolId, enabled, comingSoon } = body;

    if (!toolId) {
      return NextResponse.json(
        { success: false, error: "Tool ID is required" },
        { status: 400 }
      );
    }

    // Get current settings
    const { data: currentData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "tools_enabled")
      .single();

    const currentTools = currentData?.value || {};

    // Update the specific tool
    const updatedTools = {
      ...currentTools,
      [toolId]: {
        enabled: enabled !== undefined ? enabled : currentTools[toolId]?.enabled || false,
        coming_soon: comingSoon !== undefined ? comingSoon : currentTools[toolId]?.coming_soon || false,
      },
    };

    // Save updated settings
    const { error: updateError } = await supabase
      .from("system_settings")
      .update({ value: updatedTools })
      .eq("key", "tools_enabled");

    if (updateError) {
      console.error("Error updating tool status:", updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tools: updatedTools,
    });
  } catch (error: any) {
    console.error("Tool status update error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

