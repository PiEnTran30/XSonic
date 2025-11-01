import { QueueAdapter, createLogger } from "@xsonic/core";
import { processJob } from "./processor";

const logger = createLogger("worker-cpu", process.env.LOG_LEVEL || "info");

const queue = new QueueAdapter(
  process.env.UPSTASH_REDIS_REST_URL!,
  process.env.UPSTASH_REDIS_REST_TOKEN!
);

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_JOBS || "5", 10);
let activeJobs = 0;

async function pollQueue() {
  if (activeJobs >= MAX_CONCURRENT) {
    return;
  }

  try {
    const job = await queue.dequeueJob("cpu");
    if (!job) {
      return;
    }

    activeJobs++;
    logger.info({ jobId: job.id }, "Processing job");

    processJob(job, queue, logger)
      .then(() => {
        logger.info({ jobId: job.id }, "Job completed");
      })
      .catch((error) => {
        logger.error({ jobId: job.id, error }, "Job failed");
      })
      .finally(() => {
        activeJobs--;
      });
  } catch (error) {
    logger.error({ error }, "Poll queue error");
  }
}

// Start polling
setInterval(pollQueue, 1000);

logger.info("CPU Worker started");

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

