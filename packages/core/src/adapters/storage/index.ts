import { createClient, SupabaseClient } from "@supabase/supabase-js";

export class StorageAdapter {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor(supabaseUrl: string, supabaseKey: string, bucket: string = "xsonic-files") {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.bucket = bucket;
  }

  async getUploadUrl(
    userId: string,
    filename: string,
    contentType: string
  ): Promise<{ uploadUrl: string; fileUrl: string }> {
    const path = `${userId}/${Date.now()}-${filename}`;
    
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUploadUrl(path);

    if (error) throw error;

    const fileUrl = `${this.supabase.storage.from(this.bucket).getPublicUrl(path).data.publicUrl}`;

    return {
      uploadUrl: data.signedUrl,
      fileUrl,
    };
  }

  async uploadFile(
    userId: string,
    filename: string,
    file: Buffer | Blob,
    contentType: string
  ): Promise<string> {
    const path = `${userId}/${Date.now()}-${filename}`;
    
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    return this.supabase.storage.from(this.bucket).getPublicUrl(data.path).data.publicUrl;
  }

  async deleteFile(url: string): Promise<void> {
    const path = this.extractPathFromUrl(url);
    if (!path) return;

    await this.supabase.storage.from(this.bucket).remove([path]);
  }

  async deleteExpiredFiles(ttlDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ttlDays);

    const { data: files, error } = await this.supabase.storage
      .from(this.bucket)
      .list();

    if (error || !files) return 0;

    const expiredFiles = files.filter((file) => {
      const createdAt = new Date(file.created_at);
      return createdAt < cutoffDate;
    });

    if (expiredFiles.length > 0) {
      const paths = expiredFiles.map((f) => f.name);
      await this.supabase.storage.from(this.bucket).remove(paths);
    }

    return expiredFiles.length;
  }

  private extractPathFromUrl(url: string): string | null {
    const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return match ? match[1] : null;
  }

  async getFileSize(url: string): Promise<number> {
    const path = this.extractPathFromUrl(url);
    if (!path) return 0;

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .list(path.split("/").slice(0, -1).join("/"));

    if (error || !data) return 0;

    const filename = path.split("/").pop();
    const file = data.find((f) => f.name === filename);
    return file?.metadata?.size || 0;
  }
}

