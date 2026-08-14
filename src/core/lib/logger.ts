// src/core/lib/logger.ts

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    base: {
      app: "budgeting",
      env: process.env.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  isDev
    ? pino.transport({
        targets: [
          {
            target: "pino-pretty",
            level: "debug",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
            },
          },
          {
            target: "pino/file",
            level: "debug",
            options: {
              destination: "./logs/app.log",
              mkdir: true,
            },
          },
        ],
      })
    : undefined,
);