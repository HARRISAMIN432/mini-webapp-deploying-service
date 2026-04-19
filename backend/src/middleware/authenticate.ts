import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/token.service";
import { unauthorized } from "../utils/errors";

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (req.cookies?.access_token) {
    token = req.cookies.access_token as string;
  }

  if (!token) throw unauthorized("No access token provided");

  req.user = await verifyAccessToken(token);
  next();
};

/**
 * Same as authenticate but does NOT throw — silently sets req.user if valid.
 * Useful for routes that behave differently for authenticated vs anonymous users.
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await authenticate(req, _res, next);
  } catch {
    next();
  }
};
