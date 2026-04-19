// ─── Domain Error Codes ───────────────────────────────────────────────────────
export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION: "VALIDATION",
  RATE_LIMITED: "RATE_LIMITED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  TOKEN_REUSE: "TOKEN_REUSE",
  OTP_INVALID: "OTP_INVALID",
  OTP_EXPIRED: "OTP_EXPIRED",
  OAUTH_ERROR: "OAUTH_ERROR",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ─── AppError ─────────────────────────────────────────────────────────────────
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: ErrorCode) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Factory Helpers ──────────────────────────────────────────────────────────
export const unauthorized = (msg = "Unauthorized") =>
  new AppError(msg, 401, ErrorCode.UNAUTHORIZED);

export const forbidden = (msg = "Forbidden") =>
  new AppError(msg, 403, ErrorCode.FORBIDDEN);

export const notFound = (msg = "Not found") =>
  new AppError(msg, 404, ErrorCode.NOT_FOUND);

export const conflict = (msg: string) =>
  new AppError(msg, 409, ErrorCode.CONFLICT);

export const otpInvalid = (msg = "Invalid or expired OTP") =>
  new AppError(msg, 400, ErrorCode.OTP_INVALID);

export const tokenReuse = () =>
  new AppError(
    "Refresh token reuse detected — all sessions revoked",
    401,
    ErrorCode.TOKEN_REUSE,
  );
