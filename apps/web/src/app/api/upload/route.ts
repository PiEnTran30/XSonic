import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const toolId = formData.get("toolId") as string;
    const parametersStr = formData.get("parameters") as string;

    let parameters = {};
    if (parametersStr) {
      try {
        parameters = JSON.parse(parametersStr);
      } catch (e) {
        console.error("Failed to parse parameters:", e);
      }
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!toolId) {
      return NextResponse.json({ error: "No tool ID provided" }, { status: 400 });
    }

    // Validate file size (max 200MB)
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Max size is 200MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${user.id}/${timestamp}_${sanitizedFileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("uploads").getPublicUrl(fileName);

    // Create job in database
    const idempotencyKey = `${user.id}-${toolId}-${timestamp}-${Math.random().toString(36).substring(7)}`;

    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        tool_type: toolId,
        tool_id: toolId,
        input_file_path: fileName,
        input_file_url: publicUrl,
        status: "pending",
        idempotency_key: idempotencyKey,
        metadata: {
          original_filename: file.name,
          file_size: file.size,
          file_type: file.type,
          ...parameters, // Include tool parameters
        },
      })
      .select()
      .single();

    if (jobError) {
      console.error("Job creation error:", jobError);
      // Clean up uploaded file
      await supabase.storage.from("uploads").remove([fileName]);
      return NextResponse.json(
        { error: "Failed to create job" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      job: jobData,
      fileUrl: publicUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

