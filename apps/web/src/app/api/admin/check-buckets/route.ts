import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const requiredBuckets = ["uploads", "results"];
    const existingBuckets = buckets?.map(b => b.name) || [];
    const missingBuckets = requiredBuckets.filter(b => !existingBuckets.includes(b));

    return NextResponse.json({
      existing: existingBuckets,
      missing: missingBuckets,
    });
  } catch (error: any) {
    console.error("Check buckets error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check buckets" },
      { status: 500 }
    );
  }
}

