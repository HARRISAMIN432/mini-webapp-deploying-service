import winston from "winston";
import { env } from "../config/env";

const { combine, timestamp, json, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(timestamp(), json()),
  defaultMeta: { service: "auth-backend" },
  transports: [
    new winston.transports.Console({
      format:
        env.NODE_ENV === "production"
          ? combine(timestamp(), json())
          : combine(colorize(), simple()),
    }),
    // Add file/cloud transports in production (e.g. CloudWatch, Datadog)
  ],
  // Never crash the process on logger failure
  exitOnError: false,
});
