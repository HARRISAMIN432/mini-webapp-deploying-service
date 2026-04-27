import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";
import { env } from "../config/env";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Mongoose duplicate key
  if (
    (err as NodeJS.ErrnoException).name === "MongoServerError" &&
    (err as unknown as { code: number }).code === 11000
  ) {
    res.status(409).json({
      success: false,
      error: "A record with this value already exists",
      code: "CONFLICT",
    });
    return;
  }

  if (err.name === "ValidationError") {
    res.status(422).json({
      success: false,
      error: err.message,
      code: "VALIDATION",
    });
    return;
  }

  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error:
      env.NODE_ENV === "production" ? "Internal server error" : err.message,
    code: "INTERNAL",
  });
};
