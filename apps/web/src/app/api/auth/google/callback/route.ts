import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/storage/google-drive-oauth";

/**
 * Handle Google OAuth callback
 * GET /api/auth/google/callback?code=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=unauthorized", request.url)
      );
    }

    // Get authorization code from query params
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?error=${error}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?error=no_code", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL("/settings?error=no_refresh_token", request.url)
      );
    }

    // Save refresh token to database
    const { error: updateError } = await supabase
      .from("users")
      .update({
        google_refresh_token: tokens.refresh_token,
        google_access_token: tokens.access_token,
        google_token_expires_at: new Date(
          Date.now() + 3600 * 1000
        ).toISOString(), // 1 hour
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to save Google tokens:", updateError);
      return NextResponse.redirect(
        new URL("/settings?error=save_failed", request.url)
      );
    }

    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL("/settings?google_connected=true", request.url)
    );
  } catch (error: any) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}

