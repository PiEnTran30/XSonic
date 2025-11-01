"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueAdapter = void 0;
const redis_1 = require("@upstash/redis");
const inngest_1 = require("inngest");
class QueueAdapter {
    constructor(redisUrl, redisToken) {
        this.redis = new redis_1.Redis({
            url: redisUrl,
            token: redisToken,
        });
        this.inngest = new inngest_1.Inngest({ id: "xsonic" });
    }
    async enqueueJob(job) {
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
    async getJob(jobId) {
        const data = await this.redis.get(`job:${jobId}`);
        if (!data)
            return null;
        return JSON.parse(data);
    }
    async updateJobStatus(jobId, status, progress, message) {
        const job = await this.getJob(jobId);
        if (!job)
            return;
        job.status = status;
        if (progress !== undefined)
            job.progress = progress;
        if (message)
            job.progress_message = message;
        job.updated_at = new Date().toISOString();
        if (status === "processing" && !job.started_at) {
            job.started_at = new Date().toISOString();
        }
        if (status === "completed" || status === "failed") {
            job.completed_at = new Date().toISOString();
        }
        await this.redis.set(`job:${jobId}`, JSON.stringify(job));
    }
    async getQueueDepth(queueType) {
        const queueKey = `queue:${queueType}`;
        return await this.redis.llen(queueKey);
    }
    async dequeueJob(queueType) {
        const queueKey = `queue:${queueType}`;
        const jobId = await this.redis.rpop(queueKey);
        if (!jobId)
            return null;
        return await this.getJob(jobId);
    }
    async checkIdempotency(key) {
        return (await this.redis.get(`idempotency:${key}`));
    }
    async setIdempotency(key, jobId, ttl = 86400) {
        await this.redis.set(`idempotency:${key}`, jobId, { ex: ttl });
    }
    async hasGpuJobs() {
        const depth = await this.getQueueDepth("gpu");
        return depth > 0;
    }
    async setGpuWorkerStatus(status) {
        await this.redis.set("gpu:worker:status", status);
        await this.redis.set("gpu:worker:last_update", Date.now());
    }
    async getGpuWorkerStatus() {
        return (await this.redis.get("gpu:worker:status"));
    }
    async getGpuWorkerLastUpdate() {
        const timestamp = await this.redis.get("gpu:worker:last_update");
        return timestamp ? Number(timestamp) : 0;
    }
}
exports.QueueAdapter = QueueAdapter;
