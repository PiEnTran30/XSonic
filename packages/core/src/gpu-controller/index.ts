import { QueueAdapter } from "../adapters/queue";
import { Logger } from "../utils/logger";

export interface RunpodConfig {
  apiKey: string;
  endpoint: string;
  podId?: string;
}

export class GpuController {
  private queueAdapter: QueueAdapter;
  private logger: Logger;
  private runpodConfig: RunpodConfig;
  private cooldownMin: number;
  private idleMin: number;
  private allowCpuFallback: boolean;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastJobTime: number = 0;

  constructor(
    queueAdapter: QueueAdapter,
    logger: Logger,
    runpodConfig: RunpodConfig,
    cooldownMin: number = 5,
    idleMin: number = 10,
    allowCpuFallback: boolean = true
  ) {
    this.queueAdapter = queueAdapter;
    this.logger = logger;
    this.runpodConfig = runpodConfig;
    this.cooldownMin = cooldownMin;
    this.idleMin = idleMin;
    this.allowCpuFallback = allowCpuFallback;
  }

  async startMonitoring(): Promise<void> {
    this.logger.info("GPU Controller: Starting monitoring");
    
    this.checkInterval = setInterval(async () => {
      await this.checkAndManageGpu();
    }, 30000); // Check every 30 seconds

    await this.checkAndManageGpu();
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.logger.info("GPU Controller: Stopped monitoring");
  }

  private async checkAndManageGpu(): Promise<void> {
    try {
      const hasGpuJobs = await this.queueAdapter.hasGpuJobs();
      const workerStatus = await this.queueAdapter.getGpuWorkerStatus();

      if (hasGpuJobs && (workerStatus === "stopped" || !workerStatus)) {
        await this.startGpuWorker();
      } else if (!hasGpuJobs && workerStatus === "running") {
        const lastUpdate = await this.queueAdapter.getGpuWorkerLastUpdate();
        const idleTime = (Date.now() - lastUpdate) / 1000 / 60; // minutes

        if (idleTime >= this.idleMin) {
          await this.stopGpuWorker();
        }
      }
    } catch (error) {
      this.logger.error({ error }, "GPU Controller: Error in check cycle");
    }
  }

  private async startGpuWorker(): Promise<void> {
    try {
      this.logger.info("GPU Controller: Starting GPU worker");
      await this.queueAdapter.setGpuWorkerStatus("starting");

      const started = await this.runpodStart();

      if (started) {
        await this.queueAdapter.setGpuWorkerStatus("running");
        this.lastJobTime = Date.now();
        this.logger.info("GPU Controller: GPU worker started successfully");
      } else {
        await this.queueAdapter.setGpuWorkerStatus("stopped");
        
        if (this.allowCpuFallback) {
          this.logger.warn("GPU Controller: Failed to start GPU, falling back to CPU");
          await this.moveGpuJobsToCpu();
        } else {
          this.logger.error("GPU Controller: Failed to start GPU, jobs remain in pending-gpu");
        }
      }
    } catch (error) {
      this.logger.error({ error }, "GPU Controller: Error starting GPU worker");
      await this.queueAdapter.setGpuWorkerStatus("stopped");
    }
  }

  private async stopGpuWorker(): Promise<void> {
    try {
      this.logger.info("GPU Controller: Stopping GPU worker");
      await this.queueAdapter.setGpuWorkerStatus("stopping");

      await this.runpodStop();

      await this.queueAdapter.setGpuWorkerStatus("stopped");
      this.logger.info("GPU Controller: GPU worker stopped successfully");
    } catch (error) {
      this.logger.error({ error }, "GPU Controller: Error stopping GPU worker");
    }
  }

  private async runpodStart(): Promise<boolean> {
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
    } catch (error) {
      this.logger.error({ error }, "GPU Controller: Runpod start error");
      return false;
    }
  }

  private async runpodStop(): Promise<void> {
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
    } catch (error) {
      this.logger.error({ error }, "GPU Controller: Runpod stop error");
    }
  }

  private async waitForHealthcheck(maxWaitSec: number = 300): Promise<boolean> {
    const startTime = Date.now();
    
    while ((Date.now() - startTime) / 1000 < maxWaitSec) {
      try {
        const response = await fetch(`${this.runpodConfig.endpoint}/healthz`);
        if (response.ok) {
          return true;
        }
      } catch {
        // Continue waiting
      }
      
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return false;
  }

  private async moveGpuJobsToCpu(): Promise<void> {
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

