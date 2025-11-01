"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const core_1 = require("@xsonic/core");
const logger = (0, core_1.createLogger)("worker-gpu", process.env.LOG_LEVEL || "info");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8080;
const queue = new core_1.QueueAdapter(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN);
// Healthcheck endpoint
app.get("/healthz", (req, res) => {
    res.status(200).json({ status: "healthy" });
});
// Start server
app.listen(PORT, () => {
    logger.info({ port: PORT }, "GPU Worker started");
    queue.setGpuWorkerStatus("running");
});
// Graceful shutdown
process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down gracefully");
    await queue.setGpuWorkerStatus("stopped");
    process.exit(0);
});
// GPU job processing logic would go here
// This is a stub implementation - actual GPU processing would use
// libraries like demucs, whisper, etc.
