import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
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

    const bucketsToCreate = [
      { id: "uploads", name: "uploads", public: true },
      { id: "results", name: "results", public: true },
    ];

    const results = [];

    for (const bucket of bucketsToCreate) {
      const { data, error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: 524288000, // 500MB
      });

      if (error && !error.message.includes("already exists")) {
        results.push({ bucket: bucket.id, success: false, error: error.message });
      } else {
        results.push({ bucket: bucket.id, success: true });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("Create buckets error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create buckets" },
      { status: 500 }
    );
  }
}

