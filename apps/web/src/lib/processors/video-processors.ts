import ytdl from "ytdl-core";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { uploadToDrive } from "@/lib/storage/google-drive";

const execAsync = promisify(exec);

/**
 * Upload file to Supabase Storage using service role (bypasses RLS)
 */
async function uploadFile(filePath: string, fileName: string, contentType: string): Promise<string> {
  const supabase = createServiceClient();

  const fileBuffer = fs.readFileSync(filePath);
  const file = new File([fileBuffer], fileName);

  const { data, error } = await supabase.storage
    .from("results")
    .upload(fileName, file, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from("results")
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Clean up temp files
 */
function cleanupFiles(...filePaths: string[]) {
  filePaths.forEach((filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete ${filePath}:`, err);
    }
  });
}

/**
 * Detect video platform from URL
 */
function detectPlatform(url: string): string {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube";
  } else if (url.includes("tiktok.com")) {
    return "tiktok";
  } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
    return "facebook";
  } else if (url.includes("instagram.com")) {
    return "instagram";
  } else if (url.includes("twitter.com") || url.includes("x.com")) {
    return "twitter";
  }
  return "unknown";
}

/**
 * Download video using yt-dlp (supports multiple platforms)
 * With progress tracking
 */
async function downloadWithYtDlp(
  url: string,
  outputPath: string,
  format: string,
  quality: string,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  let formatArg = "";
  let actualOutputPath = outputPath;

  if (format === "mp3" || quality === "audio") {
    formatArg = "-f bestaudio --extract-audio --audio-format mp3";
    // yt-dlp will change extension to .mp3 automatically
    actualOutputPath = outputPath.replace(/\.[^.]+$/, ".mp3");
  } else {
    // Use simple format selectors that work reliably
    if (quality === "highest") {
      formatArg = "-f \"best[ext=mp4]/best\"";
    } else if (quality === "lowest") {
      formatArg = "-f \"worst[ext=mp4]/worst\"";
    } else {
      formatArg = "-f \"best[ext=mp4]/best\"";
    }
  }

  const command = `yt-dlp ${formatArg} --no-playlist --newline -o "${outputPath}" "${url}"`;

  return new Promise((resolve, reject) => {
    const process = exec(command);
    let title = "Downloaded Video";
    let output = "";

    process.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      output += text;
      console.log("yt-dlp:", text);

      // Parse progress
      const progressMatch = text.match(/(\d+\.?\d*)%/);
      const speedMatch = text.match(/(\d+\.?\d*\s*[KMG]?iB\/s)/);
      const etaMatch = text.match(/ETA\s+(\d+:\d+)/);

      if (progressMatch) {
        const progress = parseFloat(progressMatch[1]);
        let message = `Downloading ${progress.toFixed(1)}%`;

        if (speedMatch) message += ` at ${speedMatch[1]}`;
        if (etaMatch) message += ` - ETA ${etaMatch[1]}`;

        onProgress?.(Math.min(progress, 99), message);
      }

      // Get title
      const titleMatch = text.match(/\[download\] Destination: (.+)/);
      if (titleMatch) {
        title = path.basename(titleMatch[1], path.extname(titleMatch[1]));
      }
    });

    process.stderr?.on("data", (data: Buffer) => {
      console.error("yt-dlp stderr:", data.toString());
    });

    process.on("close", (code) => {
      if (code === 0) {
        onProgress?.(100, "Download complete");
        resolve(title);
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });

    process.on("error", (error) => {
      reject(new Error(`yt-dlp failed: ${error.message}`));
    });
  });
}

/**
 * Video Downloader Processor
 * Parameters expected in job.metadata:
 * - url: string (Video URL - supports YouTube, TikTok, Facebook, Instagram, Twitter)
 * - quality: "highest" | "lowest" | "audio"
 * - format: "mp4" | "mp3"
 * - userEmail: string (User's Gmail to share the file with)
 */
export async function processVideoDownload(
  job: any,
  onProgress?: (progress: number, message: string) => void
): Promise<{
  outputUrl: string;
  title: string;
  driveFileId: string;
  downloadUrl: string;
  localPath?: string;
  storageType?: "supabase" | "drive" | null;
  storagePath?: string;
  uploadFailed?: boolean;
  uploadError?: string | null;
}> {
  const metadata = job.metadata || {};
  const videoUrl = metadata.url;
  const quality = metadata.quality || "highest";
  const format = metadata.format || "mp4";
  const userEmail = metadata.userEmail;

  if (!videoUrl) {
    throw new Error("Video URL is required");
  }

  const platform = detectPlatform(videoUrl);

  const tempDir = os.tmpdir();
  const outputFileName = `video_${job.id}.${format}`;
  let outputPath = path.join(tempDir, outputFileName);

  let title = "Downloaded Video";

  try {
    onProgress?.(5, "Initializing download...");

    // Use yt-dlp for all platforms (more reliable and supports more sites)
    // If yt-dlp is not available, fall back to ytdl-core for YouTube only
    try {
      title = await downloadWithYtDlp(videoUrl, outputPath, format, quality, (progress, message) => {
        // Map 0-100% download to 5-80% overall progress
        const overallProgress = 5 + (progress * 0.75);
        onProgress?.(Math.floor(overallProgress), message);
      });

      // For mp3, yt-dlp changes the extension automatically
      if (format === "mp3" || quality === "audio") {
        const mp3Path = outputPath.replace(/\.[^.]+$/, ".mp3");
        if (fs.existsSync(mp3Path)) {
          outputPath = mp3Path;
        }
      }
    } catch (ytDlpError: any) {
      console.log("yt-dlp failed, trying ytdl-core for YouTube...", ytDlpError.message);

      // Fallback to ytdl-core for YouTube only
      if (platform === "youtube") {
        const info = await ytdl.getInfo(videoUrl);
        title = info.videoDetails.title;

        await new Promise((resolve, reject) => {
          let downloadOptions: any = {};

          if (format === "mp3" || quality === "audio") {
            downloadOptions = {
              quality: "highestaudio",
              filter: "audioonly",
            };
          } else {
            if (quality === "highest") {
              downloadOptions = { quality: "highestvideo" };
            } else if (quality === "lowest") {
              downloadOptions = { quality: "lowestvideo" };
            } else {
              downloadOptions = { quality: quality };
            }
          }

          const stream = ytdl(videoUrl, downloadOptions);
          const writeStream = fs.createWriteStream(outputPath);

          stream.pipe(writeStream);

          stream.on("error", (err) => reject(err));
          writeStream.on("error", (err) => reject(err));
          writeStream.on("finish", () => resolve(undefined));
        });
      } else {
        throw new Error(`Platform ${platform} requires yt-dlp. Please install: pip install yt-dlp`);
      }
    }

    // Upload to cloud storage (Supabase Storage or Google Drive)
    let storageResult: any = null;
    let storageError: string | null = null;
    let storageType: "supabase" | "drive" | null = null;

    try {
      onProgress?.(85, "Uploading to cloud storage...");

      const contentType = format === "mp3" ? "audio/mpeg" : "video/mp4";
      const fileBuffer = fs.readFileSync(outputPath);

      // Check if user provided Gmail for Drive upload
      const userGmail = job.metadata?.user_gmail;

      if (userGmail) {
        // Upload to Google Drive (shared folder)
        try {
          const { uploadToDriveWithEmail } = await import("@/lib/storage/google-drive-oauth");

          const driveResult = await uploadToDriveWithEmail(
            fileBuffer,
            `${title}.${format}`,
            userGmail,
            contentType,
            process.env.GOOGLE_DRIVE_FOLDER_ID
          );

          storageResult = {
            publicUrl: driveResult.webViewLink,
            downloadUrl: driveResult.webContentLink,
            fileId: driveResult.fileId,
            folderLink: driveResult.folderLink,
          };
          storageType = "drive";

          onProgress?.(100, "Upload complete!");
        } catch (driveErr: any) {
          console.error("Google Drive upload failed:", driveErr.message);
          storageError = driveErr.message;
          onProgress?.(100, "Download complete (Drive upload failed)");
        }
      } else {
        // No Gmail provided - skip Drive upload
        console.log("No Gmail provided, skipping Drive upload");
        onProgress?.(100, "Download complete!");
      }
    } catch (storageErr: any) {
      console.error("Cloud storage upload failed:", storageErr.message);
      storageError = storageErr.message;
      onProgress?.(100, "Download complete (Cloud upload failed)");
    }

    // Return file info (with or without cloud storage links)
    // Keep file in temp folder if cloud upload failed
    const shouldCleanup = storageResult !== null;

    if (shouldCleanup) {
      cleanupFiles(outputPath);
    } else {
      console.log(`File kept at: ${outputPath} (Cloud upload failed)`);
    }

    return {
      outputUrl: storageResult?.publicUrl || outputPath,
      title,
      driveFileId: storageResult?.fileId || "",
      downloadUrl: storageResult?.downloadUrl || outputPath,
      localPath: shouldCleanup ? undefined : outputPath,
      storageType,
      storagePath: storageResult?.path,
      uploadFailed: storageError !== null,
      uploadError: storageError,
    };
  } catch (error) {
    cleanupFiles(outputPath);
    throw error;
  }
}

/**
 * Get video info without downloading
 */
export async function getVideoInfo(url: string) {
  if (!ytdl.validateURL(url)) {
    throw new Error("Invalid YouTube URL");
  }

  const info = await ytdl.getInfo(url);

  return {
    title: info.videoDetails.title,
    duration: parseInt(info.videoDetails.lengthSeconds),
    thumbnail: info.videoDetails.thumbnails[0]?.url,
    author: info.videoDetails.author.name,
    formats: info.formats.map((f) => ({
      quality: f.qualityLabel,
      container: f.container,
      hasVideo: f.hasVideo,
      hasAudio: f.hasAudio,
    })),
  };
}

