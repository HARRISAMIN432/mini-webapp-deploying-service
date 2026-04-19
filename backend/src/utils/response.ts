import { Response } from "express";
import { ApiSuccess, ApiError } from "../types";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
): void => {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    ...(message && { message }),
  };
  res.status(statusCode).json(body);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message?: string,
): void => sendSuccess(res, data, message, 201);

export const sendError = (
  res: Response,
  error: string,
  code?: string,
  statusCode = 500,
): void => {
  const body: ApiError = { success: false, error, ...(code && { code }) };
  res.status(statusCode).json(body);
};
