import pino from "pino";

export const createLogger = (name: string, level: string = "info") => {
  return pino({
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

export type Logger = ReturnType<typeof createLogger>;

