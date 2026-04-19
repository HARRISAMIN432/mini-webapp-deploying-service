import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { sendSuccess, sendCreated } from "../utils/response";
import { env } from "../config/env";
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
  TotpEnableInput,
  TotpDisableInput,
  TotpVerifyInput,
  VerifyOtpInput,
  ResendVerificationInput,
} from "../validators/auth.validators";
import type { AccessTokenPayload } from "../types";

// ─── Cookie Helper ────────────────────────────────────────────────────────────
const REFRESH_COOKIE = "refresh_token";
const ACCESS_COOKIE = "access_token";

const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
): void => {
  const isProd = env.NODE_ENV === "production";

  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 min — mirrors JWT expiry
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth/refresh", // Scope refresh cookie to refresh endpoint only
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_COOKIE);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth/refresh" });
};

// ─── Registration ─────────────────────────────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as RegisterInput;
  const result = await authService.register(input);
  sendCreated(res, result.user, result.message);
};

// ─── Email Verification ───────────────────────────────────────────────────────
export const verifyEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, otp } = req.body as VerifyEmailInput;
  await authService.verifyEmail(email, otp);
  sendSuccess(res, null, "Email verified successfully");
};

export const resendVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.body as ResendVerificationInput;
  await authService.resendVerificationOtp(email);
  sendSuccess(
    res,
    null,
    "If this email exists and is unverified, a code has been sent",
  );
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as LoginInput;
  const result = await authService.login(input);

  if (result.requiresOtp) {
    sendSuccess(res, {
      requiresOtp: true,
      otpMethod: result.otpMethod,
      user: result.user,
    });
    return;
  }

  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  sendSuccess(res, {
    user: result.user,
    tokens: result.tokens, // Also include in body for mobile / non-cookie clients
  });
};

// ─── TOTP Login Completion ────────────────────────────────────────────────────
export const completeTotpLogin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, token } = req.body as TotpVerifyInput;
  const result = await authService.completeTotpLogin(email, token);
  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  sendSuccess(res, { user: result.user, tokens: result.tokens });
};

// ─── Email OTP Login Completion ───────────────────────────────────────────────
export const completeEmailOtpLogin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, otp } = req.body as VerifyOtpInput;
  const result = await authService.completeEmailOtpLogin(email, otp);
  setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
  sendSuccess(res, { user: result.user, tokens: result.tokens });
};

// ─── Refresh ──────────────────────────────────────────────────────────────────
export const refresh = async (req: Request, res: Response): Promise<void> => {
  // Support both cookie and body (for mobile clients)
  const incomingToken: string =
    (req.cookies?.[REFRESH_COOKIE] as string | undefined) ??
    (req.body as { refreshToken?: string }).refreshToken ??
    "";

  const tokens = await authService.refreshTokens(incomingToken);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  sendSuccess(res, tokens);
};

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logout = async (req: Request, res: Response): Promise<void> => {
  const user = req.user as AccessTokenPayload;
  const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;

  await authService.logout(user.jti, user.exp, refreshToken);
  clearAuthCookies(res);
  sendSuccess(res, null, "Logged out successfully");
};

export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  const user = req.user as AccessTokenPayload;
  await authService.logoutAllDevices(user.sub);
  clearAuthCookies(res);
  sendSuccess(res, null, "Logged out from all devices");
};

// ─── Forgot / Reset Password ──────────────────────────────────────────────────
export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const input = req.body as ForgotPasswordInput;
  await authService.forgotPassword(input);
  // Always return the same message to avoid email enumeration
  sendSuccess(
    res,
    null,
    "If this email is registered, a reset code has been sent",
  );
};

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const input = req.body as ResetPasswordInput;
  await authService.resetPassword(input);
  sendSuccess(res, null, "Password updated. Please sign in again.");
};

// ─── OAuth ────────────────────────────────────────────────────────────────────
export const oauthRedirect = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const provider = req.params.provider as "google" | "github";
  const redirectTo = (req.query.redirectTo as string | undefined) ?? "/";
  const url = await authService.getOAuthRedirectUrl(provider, redirectTo);
  res.redirect(url);
};

export const oauthCallback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const provider = req.params.provider as "google" | "github";
  const { code, state, error } = req.query as {
    code?: string;
    state?: string;
    error?: string;
  };

  const safeRedirectPath = (raw: string | undefined): string => {
    if (!raw) return "/auth/callback";

    // Allow relative paths
    if (raw.startsWith("/")) return raw;

    // Allow absolute URL only if it matches FRONTEND_URL origin
    try {
      const frontendOrigin = new URL(env.FRONTEND_URL).origin;
      const u = new URL(raw);
      if (u.origin !== frontendOrigin) return "/auth/callback";
      return `${u.pathname}${u.search}${u.hash}`;
    } catch {
      return "/auth/callback";
    }
  };

  // Provider/user cancelled or denied consent
  if (error) {
    const params = new URLSearchParams({ error });
    res.redirect(`${env.FRONTEND_URL}/auth/callback?${params}`);
    return;
  }

  if (!code || !state) {
    const params = new URLSearchParams({ error: "missing_code_or_state" });
    res.redirect(`${env.FRONTEND_URL}/auth/callback?${params}`);
    return;
  }

  const { tokens, isNew, redirectTo } = await authService.handleOAuthCallback(
    provider,
    code,
    state,
  );

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

  // Redirect to the original destination (restricted to frontend origin)
  const path = safeRedirectPath(redirectTo);
  const url = new URL(path, env.FRONTEND_URL);
  url.searchParams.set("isNew", String(isNew));
  res.redirect(url.toString());
};

// ─── TOTP Management ──────────────────────────────────────────────────────────
export const initTotp = async (req: Request, res: Response): Promise<void> => {
  const user = req.user as AccessTokenPayload;
  const result = await authService.initTotpSetup(user.sub);
  sendSuccess(res, result);
};

export const confirmTotp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user as AccessTokenPayload;
  const input = req.body as TotpEnableInput;
  await authService.confirmTotpSetup(user.sub, input);
  sendSuccess(res, null, "Two-factor authentication enabled");
};

export const disableTotp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user as AccessTokenPayload;
  const input = req.body as TotpDisableInput;
  await authService.disableTotp(user.sub, input);
  sendSuccess(res, null, "Two-factor authentication disabled");
};

// ─── Current User ─────────────────────────────────────────────────────────────
export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = req.user as AccessTokenPayload;
  const data = await authService.getMe(user.sub);
  sendSuccess(res, data);
};
