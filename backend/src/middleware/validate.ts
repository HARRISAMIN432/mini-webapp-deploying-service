import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ErrorCode } from "../utils/errors";

type Source = "body" | "query" | "params";

export const validate =
  <T>(schema: ZodSchema<T>, source: Source = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const fieldErrors = (result.error as ZodError).flatten().fieldErrors;
      res.status(422).json({
        success: false,
        error: "Validation failed",
        code: ErrorCode.VALIDATION,
        fields: fieldErrors,
      });
      return;
    }

    (req as Request & Record<string, unknown>)[source] = result.data;
    next();
  };
