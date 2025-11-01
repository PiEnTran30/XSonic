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

// GPU job processing logic would go here
// This is a stub implementation - actual GPU processing would use
// libraries like demucs, whisper, etc.

