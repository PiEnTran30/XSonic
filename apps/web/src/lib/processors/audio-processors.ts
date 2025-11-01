import ffmpeg from "fluent-ffmpeg";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * Download file from Supabase Storage to temp directory
 */
async function downloadFile(fileUrl: string, fileName: string): Promise<string> {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, fileName);

  const response = await fetch(fileUrl);
  const buffer = await response.arrayBuffer();
  
  fs.writeFileSync(tempFilePath, Buffer.from(buffer));
  
  return tempFilePath;
}

/**
 * Upload file to Supabase Storage using service role (bypasses RLS)
 */
async function uploadFile(filePath: string, fileName: string): Promise<string> {
  const supabase = createServiceClient();

  const fileBuffer = fs.readFileSync(filePath);
  const file = new File([fileBuffer], fileName);

  const { data, error } = await supabase.storage
    .from("results")
    .upload(fileName, file, {
      contentType: "audio/mpeg",
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
 * Audio Cut & Join Processor
 * Parameters expected in job.metadata:
 * - operation: "cut" | "join"
 * - startTime: number (seconds) - for cut
 * - endTime: number (seconds) - for cut
 */
export async function processCutJoin(job: any): Promise<{ outputUrl: string }> {
  const inputUrl = job.input_file_url;
  const metadata = job.metadata || {};
  const operation = metadata.operation || "cut";

  const inputFileName = `input_${job.id}.mp3`;
  const outputFileName = `result_${job.id}.mp3`;
  
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, inputFileName);
  const outputPath = path.join(tempDir, outputFileName);

  try {
    // Download input file
    await downloadFile(inputUrl, inputFileName);

    // Process based on operation
    if (operation === "cut") {
      const startTime = metadata.startTime || 0;
      const duration = metadata.duration || 30; // Default 30 seconds

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .setStartTime(startTime)
          .setDuration(duration)
          .output(outputPath)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });
    } else {
      // For join, just copy the file (in real implementation, would join multiple files)
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .output(outputPath)
          .on("end", resolve)
          .on("error", reject)
          .run();
      });
    }

    // Upload result
    const outputUrl = await uploadFile(outputPath, outputFileName);

    // Cleanup
    cleanupFiles(inputPath, outputPath);

    return { outputUrl };
  } catch (error) {
    cleanupFiles(inputPath, outputPath);
    throw error;
  }
}

/**
 * Volume & Normalize Processor
 * Parameters expected in job.metadata:
 * - volume: number (0.0 to 2.0, where 1.0 is original)
 * - normalize: boolean
 */
export async function processVolume(job: any): Promise<{ outputUrl: string }> {
  const inputUrl = job.input_file_url;
  const metadata = job.metadata || {};
  const volume = metadata.volume || 1.0;
  const normalize = metadata.normalize || false;

  const inputFileName = `input_${job.id}.mp3`;
  const outputFileName = `result_${job.id}.mp3`;
  
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, inputFileName);
  const outputPath = path.join(tempDir, outputFileName);

  try {
    // Download input file
    await downloadFile(inputUrl, inputFileName);

    // Process audio
    const command = ffmpeg(inputPath);

    if (normalize) {
      // Normalize audio to -16 LUFS
      command.audioFilters("loudnorm=I=-16:TP=-1.5:LRA=11");
    } else {
      // Adjust volume
      command.audioFilters(`volume=${volume}`);
    }

    await new Promise((resolve, reject) => {
      command
        .output(outputPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // Upload result
    const outputUrl = await uploadFile(outputPath, outputFileName);

    // Cleanup
    cleanupFiles(inputPath, outputPath);

    return { outputUrl };
  } catch (error) {
    cleanupFiles(inputPath, outputPath);
    throw error;
  }
}

/**
 * Pitch & Tempo Processor
 * Parameters expected in job.metadata:
 * - pitch: number (semitones, -12 to +12)
 * - tempo: number (0.5 to 2.0, where 1.0 is original)
 */
export async function processPitchTempo(job: any): Promise<{ outputUrl: string }> {
  const inputUrl = job.input_file_url;
  const metadata = job.metadata || {};
  const pitch = metadata.pitch || 0; // semitones
  const tempo = metadata.tempo || 1.0;

  const inputFileName = `input_${job.id}.mp3`;
  const outputFileName = `result_${job.id}.mp3`;
  
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, inputFileName);
  const outputPath = path.join(tempDir, outputFileName);

  try {
    // Download input file
    await downloadFile(inputUrl, inputFileName);

    // Build audio filters
    const filters = [];

    if (tempo !== 1.0) {
      filters.push(`atempo=${tempo}`);
    }

    if (pitch !== 0) {
      // Convert semitones to frequency ratio
      const ratio = Math.pow(2, pitch / 12);
      filters.push(`asetrate=44100*${ratio},aresample=44100`);
    }

    const command = ffmpeg(inputPath);

    if (filters.length > 0) {
      command.audioFilters(filters.join(","));
    }

    await new Promise((resolve, reject) => {
      command
        .output(outputPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // Upload result
    const outputUrl = await uploadFile(outputPath, outputFileName);

    // Cleanup
    cleanupFiles(inputPath, outputPath);

    return { outputUrl };
  } catch (error) {
    cleanupFiles(inputPath, outputPath);
    throw error;
  }
}

/**
 * Format Conversion Processor
 * Parameters expected in job.metadata:
 * - outputFormat: "mp3" | "wav" | "flac" | "aac" | "ogg"
 * - bitrate: string (e.g., "192k", "320k")
 */
export async function processFormatConversion(job: any): Promise<{ outputUrl: string }> {
  const inputUrl = job.input_file_url;
  const metadata = job.metadata || {};
  const outputFormat = metadata.outputFormat || "mp3";
  const bitrate = metadata.bitrate || "192k";

  const inputFileName = `input_${job.id}.mp3`;
  const outputFileName = `result_${job.id}.${outputFormat}`;
  
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, inputFileName);
  const outputPath = path.join(tempDir, outputFileName);

  try {
    // Download input file
    await downloadFile(inputUrl, inputFileName);

    // Convert format
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioBitrate(bitrate)
        .toFormat(outputFormat)
        .output(outputPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // Upload result
    const outputUrl = await uploadFile(outputPath, outputFileName);

    // Cleanup
    cleanupFiles(inputPath, outputPath);

    return { outputUrl };
  } catch (error) {
    cleanupFiles(inputPath, outputPath);
    throw error;
  }
}

