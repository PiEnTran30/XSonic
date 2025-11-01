import { transcribeAudio, analyzeAudio, analyzeStemSeparation, analyzeReverb } from "@/lib/ai/gemini";
import { uploadToDrive, downloadFromDrive } from "@/lib/storage/google-drive";
import fs from "fs";
import path from "path";
import os from "os";
import ffmpeg from "fluent-ffmpeg";

/**
 * Auto Subtitle Processor
 * Uses Gemini AI to transcribe audio and generate SRT subtitles
 */
export async function processAutoSubtitle(job: any): Promise<{ outputUrl: string; srtContent: string }> {
  const inputUrl = job.input_file_url;
  const metadata = job.metadata || {};

  // Download input file
  let inputBuffer: Buffer;
  if (inputUrl.includes("drive.google.com")) {
    const fileId = extractDriveFileId(inputUrl);
    inputBuffer = await downloadFromDrive(fileId);
  } else {
    // Download from URL
    const response = await fetch(inputUrl);
    inputBuffer = Buffer.from(await response.arrayBuffer());
  }

  // Extract audio if video
  const tempDir = os.tmpdir();
  const audioPath = path.join(tempDir, `audio_${job.id}.mp3`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputBuffer)
      .toFormat("mp3")
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .save(audioPath);
  });

  const audioBuffer = fs.readFileSync(audioPath);

  // Transcribe with Gemini
  const transcription = await transcribeAudio(audioBuffer, "audio/mp3");

  // Generate SRT content
  const srtContent = generateSRT(transcription.segments);

  // Save SRT file
  const srtPath = path.join(tempDir, `subtitle_${job.id}.srt`);
  fs.writeFileSync(srtPath, srtContent);

  // Upload to Google Drive
  const srtBuffer = fs.readFileSync(srtPath);
  const uploadResult = await uploadToDrive(
    srtBuffer,
    `subtitle_${job.id}.srt`,
    "text/plain",
    process.env.GOOGLE_DRIVE_FOLDER_ID
  );

  // Cleanup
  fs.unlinkSync(audioPath);
  fs.unlinkSync(srtPath);

  return {
    outputUrl: uploadResult.webContentLink,
    srtContent: srtContent,
  };
}

/**
 * Audio Enhance Processor
 * Uses Gemini AI to analyze audio and apply enhancements
 */
export async function processAudioEnhance(job: any): Promise<{ outputUrl: string; analysis: any }> {
  const inputUrl = job.input_file_url;

  // Download input file
  let inputBuffer: Buffer;
  if (inputUrl.includes("drive.google.com")) {
    const fileId = extractDriveFileId(inputUrl);
    inputBuffer = await downloadFromDrive(fileId);
  } else {
    const response = await fetch(inputUrl);
    inputBuffer = Buffer.from(await response.arrayBuffer());
  }

  // Analyze with Gemini
  const analysis = await analyzeAudio(inputBuffer, "audio/mp3");

  // Apply enhancements using ffmpeg
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `enhanced_${job.id}.mp3`);

  const params = analysis.enhancementParams;

  await new Promise<void>((resolve, reject) => {
    let command = ffmpeg(inputBuffer);

    // Build audio filter
    const filters: string[] = [];

    if (params.noise_reduction > 0) {
      filters.push(`afftdn=nf=${params.noise_reduction}`);
    }

    if (params.bass_boost > 0) {
      filters.push(`bass=g=${params.bass_boost}`);
    }

    if (params.treble_boost > 0) {
      filters.push(`treble=g=${params.treble_boost}`);
    }

    if (params.compression > 0) {
      filters.push(`acompressor=threshold=0.${params.compression}:ratio=4`);
    }

    if (filters.length > 0) {
      command = command.audioFilters(filters.join(","));
    }

    command
      .toFormat("mp3")
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .save(outputPath);
  });

  // Upload to Google Drive
  const outputBuffer = fs.readFileSync(outputPath);
  const uploadResult = await uploadToDrive(
    outputBuffer,
    `enhanced_${job.id}.mp3`,
    "audio/mp3",
    process.env.GOOGLE_DRIVE_FOLDER_ID
  );

  // Cleanup
  fs.unlinkSync(outputPath);

  return {
    outputUrl: uploadResult.webContentLink,
    analysis: analysis,
  };
}

/**
 * Stem Splitter Processor
 * Uses Gemini AI to analyze and guide stem separation
 */
export async function processStemSplitter(job: any): Promise<{ outputUrls: any; analysis: any }> {
  const inputUrl = job.input_file_url;

  // Download input file
  let inputBuffer: Buffer;
  if (inputUrl.includes("drive.google.com")) {
    const fileId = extractDriveFileId(inputUrl);
    inputBuffer = await downloadFromDrive(fileId);
  } else {
    const response = await fetch(inputUrl);
    inputBuffer = Buffer.from(await response.arrayBuffer());
  }

  // Analyze with Gemini
  const analysis = await analyzeStemSeparation(inputBuffer, "audio/mp3");

  // Note: Actual stem separation requires specialized AI models like Demucs
  // This is a placeholder that uses ffmpeg to extract basic stems
  const tempDir = os.tmpdir();
  const stems: any = {};

  // Extract vocals (high-pass filter as placeholder)
  if (analysis.hasVocals) {
    const vocalsPath = path.join(tempDir, `vocals_${job.id}.mp3`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputBuffer)
        .audioFilters("highpass=f=200,lowpass=f=3000")
        .toFormat("mp3")
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .save(vocalsPath);
    });

    const vocalsBuffer = fs.readFileSync(vocalsPath);
    const vocalsUpload = await uploadToDrive(
      vocalsBuffer,
      `vocals_${job.id}.mp3`,
      "audio/mp3",
      process.env.GOOGLE_DRIVE_FOLDER_ID
    );
    stems.vocals = vocalsUpload.webContentLink;
    fs.unlinkSync(vocalsPath);
  }

  // Extract bass (low-pass filter as placeholder)
  if (analysis.hasBass) {
    const bassPath = path.join(tempDir, `bass_${job.id}.mp3`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputBuffer)
        .audioFilters("lowpass=f=250")
        .toFormat("mp3")
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .save(bassPath);
    });

    const bassBuffer = fs.readFileSync(bassPath);
    const bassUpload = await uploadToDrive(
      bassBuffer,
      `bass_${job.id}.mp3`,
      "audio/mp3",
      process.env.GOOGLE_DRIVE_FOLDER_ID
    );
    stems.bass = bassUpload.webContentLink;
    fs.unlinkSync(bassPath);
  }

  return {
    outputUrls: stems,
    analysis: analysis,
  };
}

/**
 * De-Reverb Processor
 * Uses Gemini AI to analyze reverb and apply de-reverb
 */
export async function processDeReverb(job: any): Promise<{ outputUrl: string; analysis: any }> {
  const inputUrl = job.input_file_url;

  // Download input file
  let inputBuffer: Buffer;
  if (inputUrl.includes("drive.google.com")) {
    const fileId = extractDriveFileId(inputUrl);
    inputBuffer = await downloadFromDrive(fileId);
  } else {
    const response = await fetch(inputUrl);
    inputBuffer = Buffer.from(await response.arrayBuffer());
  }

  // Analyze with Gemini
  const analysis = await analyzeReverb(inputBuffer, "audio/mp3");

  // Apply de-reverb using ffmpeg (basic approach)
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `dereverb_${job.id}.mp3`);

  await new Promise<void>((resolve, reject) => {
    let filters = "highpass=f=80,lowpass=f=10000";

    if (analysis.hasReverb && analysis.reverbLevel > 30) {
      // Apply aggressive filtering for high reverb
      filters += ",afftdn=nf=25,equalizer=f=1000:width_type=h:width=200:g=-3";
    }

    ffmpeg(inputBuffer)
      .audioFilters(filters)
      .toFormat("mp3")
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .save(outputPath);
  });

  // Upload to Google Drive
  const outputBuffer = fs.readFileSync(outputPath);
  const uploadResult = await uploadToDrive(
    outputBuffer,
    `dereverb_${job.id}.mp3`,
    "audio/mp3",
    process.env.GOOGLE_DRIVE_FOLDER_ID
  );

  // Cleanup
  fs.unlinkSync(outputPath);

  return {
    outputUrl: uploadResult.webContentLink,
    analysis: analysis,
  };
}

/**
 * Helper: Generate SRT subtitle format
 */
function generateSRT(segments: Array<{ start: number; end: number; text: string }>): string {
  let srt = "";
  segments.forEach((segment, index) => {
    srt += `${index + 1}\n`;
    srt += `${formatTime(segment.start)} --> ${formatTime(segment.end)}\n`;
    srt += `${segment.text}\n\n`;
  });
  return srt;
}

/**
 * Helper: Format time for SRT (HH:MM:SS,mmm)
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`;
}

function pad(num: number, size: number = 2): string {
  return num.toString().padStart(size, "0");
}

/**
 * Helper: Extract Google Drive file ID from URL
 */
function extractDriveFileId(url: string): string {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : "";
}

