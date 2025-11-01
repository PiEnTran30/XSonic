import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin endpoint to setup storage bucket and disable RLS
 * Call once: GET http://localhost:3000/api/admin/setup-storage
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY not set" },
        { status: 500 }
      );
    }

    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results: any = {
      bucket: null,
      rls: null,
    };

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      return NextResponse.json(
        { error: "Failed to list buckets", details: listError.message },
        { status: 500 }
      );
    }

    const uploadsExists = buckets?.some((b) => b.id === "uploads");

    if (!uploadsExists) {
      // Create bucket
      const { data: bucket, error: createError } = await supabase.storage.createBucket("uploads", {
        public: true,
        fileSizeLimit: 524288000, // 500MB
        allowedMimeTypes: [
          "video/mp4",
          "video/webm",
          "video/quicktime",
          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/ogg",
          "audio/webm",
          "audio/flac",
          "audio/aac",
          "audio/x-m4a",
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "text/plain",
          "text/srt",
          "text/vtt",
        ],
      });

      if (createError) {
        return NextResponse.json(
          { error: "Failed to create bucket", details: createError.message },
          { status: 500 }
        );
      }

      results.bucket = "Created successfully";
    } else {
      results.bucket = "Already exists";
    }

    // Disable RLS for storage.objects table
    try {
      const { error: rlsError } = await supabase.rpc("exec_sql", {
        sql: "ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;",
      });

      if (rlsError) {
        // Try alternative method: create permissive policy
        const { error: policyError } = await supabase.rpc("exec_sql", {
          sql: `
            DROP POLICY IF EXISTS "Public Access - All Operations" ON storage.objects;
            CREATE POLICY "Public Access - All Operations"
            ON storage.objects
            FOR ALL
            TO public
            USING (bucket_id = 'uploads')
            WITH CHECK (bucket_id = 'uploads');
          `,
        });

        if (policyError) {
          results.rls = `Failed: ${policyError.message}. Please run SQL manually in Dashboard.`;
        } else {
          results.rls = "Policy created successfully";
        }
      } else {
        results.rls = "Disabled successfully";
      }
    } catch (rlsErr: any) {
      results.rls = `Error: ${rlsErr.message}. Please run SQL manually in Dashboard.`;
    }

    return NextResponse.json({
      success: true,
      message: "Storage setup completed",
      results,
      manual_fix: results.rls?.includes("Failed") || results.rls?.includes("Error")
        ? "Run this SQL in Dashboard: ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;"
        : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Setup failed", details: error.message },
      { status: 500 }
    );
  }
}

