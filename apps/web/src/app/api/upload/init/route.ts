import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { StorageAdapter } from "@xsonic/core";
import { z } from "zod";

const uploadSchema = z.object({
  filename: z.string(),
  size: z.number(),
  mime_type: z.string(),
  tool_type: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const body = await request.json();
    const validated = uploadSchema.parse(body);

    // Validate file size
    const maxSize = 2000 * 1024 * 1024; // 2GB default
    if (validated.size > maxSize) {
      return NextResponse.json(
        { success: false, error: { code: "FILE_TOO_LARGE", message: "File exceeds maximum size" } },
        { status: 400 }
      );
    }

    // Get upload URL
    const storage = new StorageAdapter(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { uploadUrl, fileUrl } = await storage.getUploadUrl(
      user.id,
      validated.filename,
      validated.mime_type
    );

    return NextResponse.json({
      success: true,
      data: {
        upload_id: crypto.randomUUID(),
        upload_url: uploadUrl,
        file_url: fileUrl,
      },
    });
  } catch (error: any) {
    console.error("Upload init error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Failed to initialize upload",
        },
      },
      { status: 500 }
    );
  }
}

