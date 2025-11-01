"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageAdapter = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class StorageAdapter {
    constructor(supabaseUrl, supabaseKey, bucket = "xsonic-files") {
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        this.bucket = bucket;
    }
    async getUploadUrl(userId, filename, contentType) {
        const path = `${userId}/${Date.now()}-${filename}`;
        const { data, error } = await this.supabase.storage
            .from(this.bucket)
            .createSignedUploadUrl(path);
        if (error)
            throw error;
        const fileUrl = `${this.supabase.storage.from(this.bucket).getPublicUrl(path).data.publicUrl}`;
        return {
            uploadUrl: data.signedUrl,
            fileUrl,
        };
    }
    async uploadFile(userId, filename, file, contentType) {
        const path = `${userId}/${Date.now()}-${filename}`;
        const { data, error } = await this.supabase.storage
            .from(this.bucket)
            .upload(path, file, {
            contentType,
            upsert: false,
        });
        if (error)
            throw error;
        return this.supabase.storage.from(this.bucket).getPublicUrl(data.path).data.publicUrl;
    }
    async deleteFile(url) {
        const path = this.extractPathFromUrl(url);
        if (!path)
            return;
        await this.supabase.storage.from(this.bucket).remove([path]);
    }
    async deleteExpiredFiles(ttlDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ttlDays);
        const { data: files, error } = await this.supabase.storage
            .from(this.bucket)
            .list();
        if (error || !files)
            return 0;
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
    extractPathFromUrl(url) {
        const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
        return match ? match[1] : null;
    }
    async getFileSize(url) {
        const path = this.extractPathFromUrl(url);
        if (!path)
            return 0;
        const { data, error } = await this.supabase.storage
            .from(this.bucket)
            .list(path.split("/").slice(0, -1).join("/"));
        if (error || !data)
            return 0;
        const filename = path.split("/").pop();
        const file = data.find((f) => f.name === filename);
        return file?.metadata?.size || 0;
    }
}
exports.StorageAdapter = StorageAdapter;
