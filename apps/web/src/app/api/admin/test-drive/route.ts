import { NextResponse } from "next/server";
import { testDriveConnection } from "@/lib/storage/google-drive-oauth";

export async function GET() {
  try {
    const result = await testDriveConnection();
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Test Drive error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to test Google Drive",
        details: { error: error.message },
      },
      { status: 500 }
    );
  }
}

