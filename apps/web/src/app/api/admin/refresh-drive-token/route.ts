import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/storage/google-drive-oauth";

/**
 * Get Google OAuth URL for admin to refresh token
 * GET /api/admin/refresh-drive-token
 */
export async function GET() {
  try {
    const authUrl = getAuthUrl();
    
    return NextResponse.json({
      success: true,
      authUrl,
      instructions: [
        "1. Click the URL below to authorize",
        "2. Sign in with your Google account (with Drive 2TB)",
        "3. Copy the authorization code",
        "4. Paste it in the next step",
      ],
    });
  } catch (error: any) {
    console.error("Get auth URL error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Exchange authorization code for refresh token
 * POST /api/admin/refresh-drive-token
 */
export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Authorization code is required" },
        { status: 400 }
      );
    }

    const { exchangeCodeForTokens } = await import("@/lib/storage/google-drive-oauth");
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      return NextResponse.json(
        {
          success: false,
          error: "No refresh token received. Make sure to revoke previous access and try again.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Refresh token obtained successfully!",
      refreshToken: tokens.refresh_token,
      instructions: [
        "1. Copy the refresh token below",
        "2. Update your .env.local file:",
        `   GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`,
        "3. Restart your dev server",
      ],
    });
  } catch (error: any) {
    console.error("Exchange code error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

