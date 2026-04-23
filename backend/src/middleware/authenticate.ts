import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/token.service";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else if (req.cookies?.access_token) {
      token = req.cookies.access_token as string;
    }

    if (!token) {
      console.log("❌ No token in authenticate middleware");
      res
        .status(401)
        .json({ success: false, error: "No access token provided" });
      return;
    }

    req.user = await verifyAccessToken(token);
    console.log("✅ Authenticate middleware succeeded");
    next();
  } catch (error) {
    console.error("❌ Authentication error:", error);
    res.status(401).json({ success: false, error: "Invalid access token" });
  }
};

export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await authenticate(req, res, next);
  } catch {
    next();
  }
};
