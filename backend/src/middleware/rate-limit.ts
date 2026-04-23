import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { ErrorCode } from "../utils/errors";

const limiterResponse = (message: string) => ({
  success: false,
  error: message,
  code: ErrorCode.RATE_LIMITED,
});

// rate-limit.ts
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return (
      req.originalUrl?.includes("/projects/deployments/logs/stream") ||
      req.originalUrl?.includes("/deployments/logs/stream") ||
      req.url?.includes("/logs/stream")
    );
  },
  message: limiterResponse("Too many requests, please try again later"),
});

/** Tight limiter for auth mutation endpoints — 10 req / 15 min */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: limiterResponse("Too many auth attempts, please try again later"),
});

/** OTP/email endpoints — 5 req / 10 min */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: limiterResponse(
    "Too many OTP requests, please wait before trying again",
  ),
});
