"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIdempotencyKey = exports.sanitizeFilename = exports.validateUrl = exports.validateMimeType = exports.validateFileSize = void 0;
const validateFileSize = (size, maxSizeMb) => {
    return size <= maxSizeMb * 1024 * 1024;
};
exports.validateFileSize = validateFileSize;
const validateMimeType = (mimeType, allowedTypes) => {
    return allowedTypes.some((type) => {
        if (type.endsWith("/*")) {
            const prefix = type.slice(0, -2);
            return mimeType.startsWith(prefix);
        }
        return mimeType === type;
    });
};
exports.validateMimeType = validateMimeType;
const validateUrl = (url, allowedHosts) => {
    try {
        const urlObj = new URL(url);
        return allowedHosts.some((host) => {
            if (host.startsWith("*.")) {
                const domain = host.slice(2);
                return urlObj.hostname.endsWith(domain);
            }
            return urlObj.hostname === host;
        });
    }
    catch {
        return false;
    }
};
exports.validateUrl = validateUrl;
const sanitizeFilename = (filename) => {
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
};
exports.sanitizeFilename = sanitizeFilename;
const generateIdempotencyKey = (userId, toolType, timestamp) => {
    return `${userId}:${toolType}:${timestamp}`;
};
exports.generateIdempotencyKey = generateIdempotencyKey;
