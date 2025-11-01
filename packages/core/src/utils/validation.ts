export const validateFileSize = (size: number, maxSizeMb: number): boolean => {
  return size <= maxSizeMb * 1024 * 1024;
};

export const validateMimeType = (mimeType: string, allowedTypes: string[]): boolean => {
  return allowedTypes.some((type) => {
    if (type.endsWith("/*")) {
      const prefix = type.slice(0, -2);
      return mimeType.startsWith(prefix);
    }
    return mimeType === type;
  });
};

export const validateUrl = (url: string, allowedHosts: string[]): boolean => {
  try {
    const urlObj = new URL(url);
    return allowedHosts.some((host) => {
      if (host.startsWith("*.")) {
        const domain = host.slice(2);
        return urlObj.hostname.endsWith(domain);
      }
      return urlObj.hostname === host;
    });
  } catch {
    return false;
  }
};

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
};

export const generateIdempotencyKey = (userId: string, toolType: string, timestamp: number): string => {
  return `${userId}:${toolType}:${timestamp}`;
};

