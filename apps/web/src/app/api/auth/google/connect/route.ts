import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/storage/google-drive-oauth";

/**
 * Redirect user to Google OAuth consent screen
 * GET /api/auth/google/connect
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate OAuth URL
    const authUrl = getAuthUrl();

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Google OAuth connect error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to connect Google Drive" },
      { status: 500 }
    );
  }
}

