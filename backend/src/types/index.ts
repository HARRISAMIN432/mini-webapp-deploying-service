export type {
  AuthMethod,
  PublicUser,
  IUser,
  IUserMethods,
  IUserModel,
} from "../models/user.model";
export type {
  OAuthProvider,
  IOAuthAccount,
  IOAuthAccountModel,
} from "../models/oauth-account-model";
export type { IProject, IProjectModel } from "../models/project.model";
export type {
  DeploymentStatus,
  IDeployment,
  IDeploymentModel,
} from "../models/deployment.model";

// ─── Token Payloads ───────────────────────────────────────────────────────────
export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

// ─── Token Pair ───────────────────────────────────────────────────────────────
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ─── OAuth Profile ────────────────────────────────────────────────────────────
export interface OAuthProfile {
  providerId: string;
  provider: "google" | "github";
  email: string;
  name: string;
  avatarUrl?: string;
}

// ─── Express Request Extension ────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// ─── API Response Shapes ──────────────────────────────────────────────────────
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
