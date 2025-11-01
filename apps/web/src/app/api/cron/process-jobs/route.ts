import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Cron job endpoint to trigger job processing
 * This should be called every minute by Vercel Cron or similar service
 *
 * Vercel Cron config in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-jobs",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "dev-cron-secret";

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Call worker API
    const workerUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const workerToken = process.env.WORKER_SECRET_TOKEN || "dev-worker-token";

    const response = await fetch(`${workerUrl}/api/jobs/process`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${workerToken}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      workerResult: result,
    });
  } catch (error: any) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: error.message || "Cron job failed" },
      { status: 500 }
    );
  }
}

