import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

/**
 * Download file from local temp folder
 * GET /api/download/[jobId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createClient();

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", params.jobId)
      .eq("user_id", user.id) // Ensure user owns this job
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get local path from metadata
    const localPath = job.metadata?.local_path;

    if (!localPath) {
      return NextResponse.json(
        { error: "File not available for download" },
        { status: 404 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(localPath)) {
      return NextResponse.json(
        { error: "File not found on server" },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = fs.readFileSync(localPath);
    const fileName = path.basename(localPath);
    const fileExt = path.extname(localPath).toLowerCase();

    // Determine content type from file extension
    let contentType = "application/octet-stream";
    if (fileExt === ".mp3") {
      contentType = "audio/mpeg";
    } else if (fileExt === ".mp4") {
      contentType = "video/mp4";
    } else if (fileExt === ".webm") {
      contentType = "video/webm";
    } else if (fileExt === ".m4a") {
      contentType = "audio/mp4";
    }

    // Return file
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to download file" },
      { status: 500 }
    );
  }
}

