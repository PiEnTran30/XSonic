"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GpuController = void 0;
class GpuController {
    constructor(queueAdapter, logger, runpodConfig, cooldownMin = 5, idleMin = 10, allowCpuFallback = true) {
        this.checkInterval = null;
        this.lastJobTime = 0;
        this.queueAdapter = queueAdapter;
        this.logger = logger;
        this.runpodConfig = runpodConfig;
        this.cooldownMin = cooldownMin;
        this.idleMin = idleMin;
        this.allowCpuFallback = allowCpuFallback;
    }
    async startMonitoring() {
        this.logger.info("GPU Controller: Starting monitoring");
        this.checkInterval = setInterval(async () => {
            await this.checkAndManageGpu();
        }, 30000); // Check every 30 seconds
        await this.checkAndManageGpu();
    }
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.logger.info("GPU Controller: Stopped monitoring");
    }
    async checkAndManageGpu() {
        try {
            const hasGpuJobs = await this.queueAdapter.hasGpuJobs();
            const workerStatus = await this.queueAdapter.getGpuWorkerStatus();
            if (hasGpuJobs && (workerStatus === "stopped" || !workerStatus)) {
                await this.startGpuWorker();
            }
            else if (!hasGpuJobs && workerStatus === "running") {
                const lastUpdate = await this.queueAdapter.getGpuWorkerLastUpdate();
                const idleTime = (Date.now() - lastUpdate) / 1000 / 60; // minutes
                if (idleTime >= this.idleMin) {
                    await this.stopGpuWorker();
                }
            }
        }
        catch (error) {
            this.logger.error({ error }, "GPU Controller: Error in check cycle");
        }
    }
    async startGpuWorker() {
        try {
            this.logger.info("GPU Controller: Starting GPU worker");
            await this.queueAdapter.setGpuWorkerStatus("starting");
            const started = await this.runpodStart();
            if (started) {
                await this.queueAdapter.setGpuWorkerStatus("running");
                this.lastJobTime = Date.now();
                this.logger.info("GPU Controller: GPU worker started successfully");
            }
            else {
                await this.queueAdapter.setGpuWorkerStatus("stopped");
                if (this.allowCpuFallback) {
                    this.logger.warn("GPU Controller: Failed to start GPU, falling back to CPU");
                    await this.moveGpuJobsToCpu();
                }
                else {
                    this.logger.error("GPU Controller: Failed to start GPU, jobs remain in pending-gpu");
                }
            }
        }
        catch (error) {
            this.logger.error({ error }, "GPU Controller: Error starting GPU worker");
            await this.queueAdapter.setGpuWorkerStatus("stopped");
        }
    }
    async stopGpuWorker() {
        try {
            this.logger.info("GPU Controller: Stopping GPU worker");
            await this.queueAdapter.setGpuWorkerStatus("stopping");
            await this.runpodStop();
            await this.queueAdapter.setGpuWorkerStatus("stopped");
            this.logger.info("GPU Controller: GPU worker stopped successfully");
        }
        catch (error) {
            this.logger.error({ error }, "GPU Controller: Error stopping GPU worker");
        }
    }
    async runpodStart() {
        if (!this.runpodConfig.apiKey || !this.runpodConfig.endpoint) {
            this.logger.warn("GPU Controller: Runpod config not available");
            return false;
        }
        try {
            const response = await fetch(`${this.runpodConfig.endpoint}/start`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.runpodConfig.apiKey}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                this.logger.error({ status: response.status }, "GPU Controller: Runpod start failed");
                return false;
            }
            // Wait for healthcheck
            const healthy = await this.waitForHealthcheck();
            return healthy;
        }
        catch (error) {
            this.logger.error({ error }, "GPU Controller: Runpod start error");
            return false;
        }
    }
    async runpodStop() {
        if (!this.runpodConfig.apiKey || !this.runpodConfig.endpoint) {
            return;
        }
        try {
            await fetch(`${this.runpodConfig.endpoint}/stop`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.runpodConfig.apiKey}`,
                    "Content-Type": "application/json",
                },
            });
        }
        catch (error) {
            this.logger.error({ error }, "GPU Controller: Runpod stop error");
        }
    }
    async waitForHealthcheck(maxWaitSec = 300) {
        const startTime = Date.now();
        while ((Date.now() - startTime) / 1000 < maxWaitSec) {
            try {
                const response = await fetch(`${this.runpodConfig.endpoint}/healthz`);
                if (response.ok) {
                    return true;
                }
            }
            catch {
                // Continue waiting
            }
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        return false;
    }
    async moveGpuJobsToCpu() {
        // Move pending GPU jobs to CPU queue
        let job = await this.queueAdapter.dequeueJob("gpu");
        while (job) {
            job.requirements.requires_gpu = false;
            job.requirements.requires_cpu = true;
            await this.queueAdapter.enqueueJob(job);
            job = await this.queueAdapter.dequeueJob("gpu");
        }
    }
}
exports.GpuController = GpuController;
