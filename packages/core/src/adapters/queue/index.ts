import { Redis } from "@upstash/redis";
import { Inngest } from "inngest";
import { Job, JobStatus } from "../../types/database";

export class QueueAdapter {
  private redis: Redis;
  private inngest: Inngest;

  constructor(redisUrl: string, redisToken: string) {
    this.redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    this.inngest = new Inngest({ id: "xsonic" });
  }

  async enqueueJob(job: Job): Promise<void> {
    const queueKey = job.requirements.requires_gpu ? "queue:gpu" : "queue:cpu";
    
    await this.redis.set(`job:${job.id}`, JSON.stringify(job));
    await this.redis.lpush(queueKey, job.id);
    await this.redis.expire(`job:${job.id}`, 7 * 24 * 60 * 60);
    
    await this.inngest.send({
      name: "job.created",
      data: {
        jobId: job.id,
        toolType: job.tool_type,
        requiresGpu: job.requirements.requires_gpu,
      },
    });
  }

  async getJob(jobId: string): Promise<Job | null> {
    const data = await this.redis.get(`job:${jobId}`);
    if (!data) return null;
    return JSON.parse(data as string);
  }

  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    progress?: number,
    message?: string
  ): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    job.status = status;
    if (progress !== undefined) job.progress = progress;
    if (message) job.progress_message = message;
    job.updated_at = new Date().toISOString();

    if (status === "processing" && !job.started_at) {
      job.started_at = new Date().toISOString();
    }
    if (status === "completed" || status === "failed") {
      job.completed_at = new Date().toISOString();
    }

    await this.redis.set(`job:${jobId}`, JSON.stringify(job));
  }

  async getQueueDepth(queueType: "cpu" | "gpu"): Promise<number> {
    const queueKey = `queue:${queueType}`;
    return await this.redis.llen(queueKey);
  }

  async dequeueJob(queueType: "cpu" | "gpu"): Promise<Job | null> {
    const queueKey = `queue:${queueType}`;
    const jobId = await this.redis.rpop(queueKey);
    if (!jobId) return null;
    return await this.getJob(jobId as string);
  }

  async checkIdempotency(key: string): Promise<string | null> {
    return (await this.redis.get(`idempotency:${key}`)) as string | null;
  }

  async setIdempotency(key: string, jobId: string, ttl: number = 86400): Promise<void> {
    await this.redis.set(`idempotency:${key}`, jobId, { ex: ttl });
  }

  async hasGpuJobs(): Promise<boolean> {
    const depth = await this.getQueueDepth("gpu");
    return depth > 0;
  }

  async setGpuWorkerStatus(status: "starting" | "running" | "stopping" | "stopped"): Promise<void> {
    await this.redis.set("gpu:worker:status", status);
    await this.redis.set("gpu:worker:last_update", Date.now());
  }

  async getGpuWorkerStatus(): Promise<string | null> {
    return (await this.redis.get("gpu:worker:status")) as string | null;
  }

  async getGpuWorkerLastUpdate(): Promise<number> {
    const timestamp = await this.redis.get("gpu:worker:last_update");
    return timestamp ? Number(timestamp) : 0;
  }
}

