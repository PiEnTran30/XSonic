import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  try {
    const supabase = createClient();

    // Check maintenance mode
    const { data: maintenanceSetting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();

    const isMaintenanceMode = maintenanceSetting?.value?.enabled === true;

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check if user is admin
    let isAdmin = false;
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      isAdmin = userData?.role === "admin";
    }

    // If on maintenance page
    if (pathname === "/maintenance") {
      // If maintenance is OFF or user is admin, redirect to home
      if (!isMaintenanceMode || isAdmin) {
        const response = NextResponse.redirect(new URL("/", request.url));
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        return response;
      }
      // Otherwise allow access to maintenance page
      return NextResponse.next();
    }

    // If maintenance mode is ON and user is NOT admin, redirect to maintenance page
    if (isMaintenanceMode && !isAdmin) {
      const response = NextResponse.redirect(new URL("/maintenance", request.url));
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    // Add no-cache headers to response
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    // On error, allow request to proceed
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

