import { createClient } from "@/lib/supabase/server";

/**
 * Upload file to Supabase Storage
 * Alternative to Google Drive for users without Google Workspace
 */
export async function uploadToSupabase(
  fileBuffer: Buffer,
  fileName: string,
  userId: string,
  contentType: string = "video/mp4"
): Promise<{
  publicUrl: string;
  path: string;
}> {
  const supabase = createClient();

  // Create unique path: userId/timestamp_filename
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${timestamp}_${sanitizedFileName}`;

  // Upload to storage bucket
  const { data, error } = await supabase.storage
    .from("videos")
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: false,
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("videos")
    .getPublicUrl(data.path);

  return {
    publicUrl: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFromSupabase(filePath: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage.from("videos").remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete from Supabase Storage: ${error.message}`);
  }
}

/**
 * Get signed URL for private file (expires in 1 hour)
 */
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from("videos")
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

