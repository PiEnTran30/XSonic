import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { QueueAdapter, createLogger } from "@xsonic/core";

const logger = createLogger("worker-gpu", process.env.LOG_LEVEL || "info");
const app = express();
const PORT = process.env.PORT || 8080;

const WORKER_ID = process.env.WORKER_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const API_BASE_URL = process.env.API_BASE_URL || SUPABASE_URL?.replace('/rest/v1', '');

const queue = new QueueAdapter(
  process.env.UPSTASH_REDIS_REST_URL!,
  process.env.UPSTASH_REDIS_REST_TOKEN!
);

// Send heartbeat to main server
async function sendHeartbeat() {
  if (!WORKER_ID || !API_BASE_URL) {
    logger.warn("WORKER_ID or API_BASE_URL not set, skipping heartbeat");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/gpu-workers/${WORKER_ID}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "running",
        metadata: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      logger.error({ status: response.status }, "Heartbeat failed");
    } else {
      logger.debug("Heartbeat sent successfully");
    }
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to send heartbeat");
  }
}

// Healthcheck endpoint
app.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    workerId: WORKER_ID,
    uptime: process.uptime(),
  });
});

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT, workerId: WORKER_ID }, "GPU Worker started");
  queue.setGpuWorkerStatus("running");

  // Send initial heartbeat
  sendHeartbeat();

  // Send heartbeat every 30 seconds
  setInterval(sendHeartbeat, 30000);

  // Poll for jobs every 5 seconds
  setInterval(pollJobs, 5000);

  // Start polling immediately
  pollJobs();
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await queue.setGpuWorkerStatus("stopped");
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await queue.setGpuWorkerStatus("stopped");
  process.exit(0);
});

// Poll for jobs from Redis queue
async function pollJobs() {
  try {
    const job = await queue.dequeueJob("gpu");

    if (job) {
      logger.info({ jobId: job.id, toolType: job.tool_type }, "Processing job");
      await processJob(job);
    }
  } catch (error: any) {
    logger.error({ error: error.message }, "Error polling jobs");
  }
}

// Process a job
async function processJob(job: any) {
  try {
    // Update job status to processing
    await queue.updateJobStatus(job.id, "processing", 0, "Starting GPU processing...");

    // Route to appropriate processor based on tool_type
    switch (job.tool_type) {
      case "stem-splitter":
        await processStemSplitter(job);
        break;
      case "audio-enhance":
        await processAudioEnhance(job);
        break;
      case "de-reverb":
        await processDeReverb(job);
        break;
      case "auto-subtitle":
        await processAutoSubtitle(job);
        break;
      default:
        throw new Error(`Unknown tool type: ${job.tool_type}`);
    }

    logger.info({ jobId: job.id }, "Job completed successfully");
  } catch (error: any) {
    logger.error({ jobId: job.id, error: error.message }, "Job processing failed");
    await queue.updateJobStatus(job.id, "failed", 0, `Error: ${error.message}`);
  }
}

// Stem Splitter processor (using Demucs)
async function processStemSplitter(job: any) {
  const { spawn } = await import("child_process");

  await queue.updateJobStatus(job.id, "processing", 10, "Downloading audio file...");

  // Download input file
  const inputPath = `/tmp/input_${job.id}.mp3`;
  const outputDir = `/tmp/output_${job.id}`;

  // Download file from URL
  const response = await fetch(job.input_file_url);
  const buffer = await response.arrayBuffer();
  const fs = await import("fs/promises");
  await fs.writeFile(inputPath, Buffer.from(buffer));

  await queue.updateJobStatus(job.id, "processing", 30, "Running Demucs AI model...");

  // Run Demucs
  await new Promise((resolve, reject) => {
    const demucs = spawn("python3", [
      "-m", "demucs",
      "--two-stems", "vocals",
      "-o", outputDir,
      inputPath
    ]);

    demucs.stdout.on("data", (data) => {
      logger.debug({ output: data.toString() }, "Demucs output");
    });

    demucs.stderr.on("data", (data) => {
      logger.debug({ error: data.toString() }, "Demucs stderr");
    });

    demucs.on("close", (code) => {
      if (code === 0) {
        resolve(null);
      } else {
        reject(new Error(`Demucs exited with code ${code}`));
      }
    });
  });

  await queue.updateJobStatus(job.id, "processing", 80, "Uploading results...");

  // Upload results to Supabase Storage
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find output files
  const outputFiles = await fs.readdir(`${outputDir}/htdemucs`);
  const vocalsPath = `${outputDir}/htdemucs/${outputFiles[0]}/vocals.wav`;
  const instrumentalPath = `${outputDir}/htdemucs/${outputFiles[0]}/no_vocals.wav`;

  // Upload vocals
  const vocalsBuffer = await fs.readFile(vocalsPath);
  const { error: vocalsError } = await supabase.storage
    .from("uploads")
    .upload(`results/${job.id}_vocals.wav`, vocalsBuffer, {
      contentType: "audio/wav",
    });

  if (vocalsError) throw vocalsError;

  // Upload instrumental
  const instrumentalBuffer = await fs.readFile(instrumentalPath);
  const { error: instrumentalError } = await supabase.storage
    .from("uploads")
    .upload(`results/${job.id}_instrumental.wav`, instrumentalBuffer, {
      contentType: "audio/wav",
    });

  if (instrumentalError) throw instrumentalError;

  // Get public URLs
  const { data: { publicUrl: vocalsUrl } } = supabase.storage
    .from("uploads")
    .getPublicUrl(`results/${job.id}_vocals.wav`);

  const { data: { publicUrl: instrumentalUrl } } = supabase.storage
    .from("uploads")
    .getPublicUrl(`results/${job.id}_instrumental.wav`);

  // Update job in database with results
  await supabase
    .from("jobs")
    .update({
      status: "completed",
      progress: 100,
      progress_message: "Download complete!",
      output_file_url: vocalsUrl,
      metadata: {
        vocals_url: vocalsUrl,
        instrumental_url: instrumentalUrl,
      },
    })
    .eq("id", job.id);

  await queue.updateJobStatus(job.id, "completed", 100, "Download complete!");

  // Cleanup
  await fs.rm(inputPath);
  await fs.rm(outputDir, { recursive: true });
}

// Placeholder processors for other tools
async function processAudioEnhance(job: any) {
  await queue.updateJobStatus(job.id, "processing", 50, "Audio enhance not implemented yet");
  throw new Error("Audio enhance not implemented");
}

async function processDeReverb(job: any) {
  await queue.updateJobStatus(job.id, "processing", 50, "De-reverb not implemented yet");
  throw new Error("De-reverb not implemented");
}

async function processAutoSubtitle(job: any) {
  await queue.updateJobStatus(job.id, "processing", 50, "Auto subtitle not implemented yet");
  throw new Error("Auto subtitle not implemented");
}

