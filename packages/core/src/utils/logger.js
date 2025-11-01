"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = void 0;
const pino_1 = __importDefault(require("pino"));
const createLogger = (name, level = "info") => {
    return (0, pino_1.default)({
        name,
        level,
        formatters: {
            level: (label) => {
                return { level: label };
            },
        },
        redact: {
            paths: ["email", "password", "token", "apiKey", "*.email", "*.password", "*.token"],
            remove: true,
        },
    });
};
exports.createLogger = createLogger;
