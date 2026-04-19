import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { User } from "../models/user.model";
import { OAuthAccount } from "../models/oauth-account-model";
import {
  issueTokenPair,
  revokeAccessToken,
  revokeAllUserSessions,
  rotateAndIssueTokenPair,
} from "./token.service";
import {
  generateEmailOtp,
  verifyEmailOtp,
  generateTotpSecret,
  generateTotpQrCode,
  verifyTotpToken,
} from "./otp.service";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email.service";
import {
  buildGoogleAuthUrl,
  buildGithubAuthUrl,
  generateOAuthState,
  consumeOAuthState,
  exchangeGoogleCode,
  exchangeGithubCode,
} from "./oauth.service";
import { conflict, unauthorized, forbidden, notFound } from "../utils/errors";
import type { TokenPair, PublicUser, OAuthProfile } from "../types";
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  TotpEnableInput,
  TotpDisableInput,
} from "../validators/auth.validators";

// ─── Register ─────────────────────────────────────────────────────────────────
export const register = async (
  input: RegisterInput,
): Promise<{ user: PublicUser; message: string }> => {
  const existing = await User.findByEmail(input.email);
  if (existing) throw conflict("An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    authMethod: "email",
  });

  const otp = await generateEmailOtp(user.email, "verify-email");
  await sendVerificationEmail(user.email, user.name, otp);

  return {
    user: user.toPublic(),
    message: "Account created. Check your email for a verification code.",
  };
};

// ─── Verify Email OTP ─────────────────────────────────────────────────────────
export const verifyEmail = async (
  email: string,
  otp: string,
): Promise<void> => {
  await verifyEmailOtp(email, "verify-email", otp);

  const user = await User.findByEmail(email);
  if (!user) throw notFound("User not found");

  user.emailVerified = true;
  await user.save();
};

export const resendVerificationOtp = async (email: string): Promise<void> => {
  const user = await User.findByEmail(email);
  if (!user || user.emailVerified) return; // silently ignore to not leak existence
  const otp = await generateEmailOtp(user.email, "verify-email");
  await sendVerificationEmail(user.email, user.name, otp);
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = async (
  input: LoginInput,
): Promise<
  | { requiresOtp: true; otpMethod: "email" | "totp"; user: PublicUser }
  | { requiresOtp: false; tokens: TokenPair; user: PublicUser }
> => {
  // Always fetch passwordHash (select: false by default)
  const user = await User.findByEmail(input.email).select("+passwordHash");
  if (!user) throw unauthorized("Invalid email or password");

  if (user.authMethod !== "email") {
    throw unauthorized(
      `This account uses ${user.authMethod} sign-in. Use the OAuth button instead.`,
    );
  }

  const valid = await user.comparePassword(input.password);
  if (!valid) throw unauthorized("Invalid email or password");

  if (!user.emailVerified) {
    // Re-send verification OTP so the user can complete it
    const otp = await generateEmailOtp(user.email, "verify-email");
    await sendVerificationEmail(user.email, user.name, otp);
    throw forbidden(
      "Please verify your email first. A new code has been sent.",
    );
  }

  // ── TOTP 2FA check ────────────────────────────────────────────────────────
  if (user.totpEnabled) {
    return { requiresOtp: true, otpMethod: "totp", user: user.toPublic() };
  }

  const tokens = await issueTokenPair(
    user._id.toString(),
    user.email,
    user.name,
    input.rememberMe,
  );

  return { requiresOtp: false, tokens, user: user.toPublic() };
};

// ─── Complete Login with TOTP ─────────────────────────────────────────────────
export const completeTotpLogin = async (
  email: string,
  token: string,
): Promise<{ tokens: TokenPair; user: PublicUser }> => {
  const user = await User.findByEmail(email).select("+totpSecret");
  if (!user || !user.totpEnabled || !user.totpSecret) {
    throw unauthorized("TOTP not enabled for this account");
  }

  const valid = verifyTotpToken(user.totpSecret, token);
  if (!valid) throw unauthorized("Invalid TOTP code");

  const tokens = await issueTokenPair(
    user._id.toString(),
    user.email,
    user.name,
  );
  return { tokens, user: user.toPublic() };
};

// ─── Complete Login with Email OTP ───────────────────────────────────────────
export const completeEmailOtpLogin = async (
  email: string,
  otp: string,
): Promise<{ tokens: TokenPair; user: PublicUser }> => {
  await verifyEmailOtp(email, "login-otp", otp);

  const user = await User.findByEmail(email);
  if (!user) throw notFound("User not found");

  const tokens = await issueTokenPair(
    user._id.toString(),
    user.email,
    user.name,
  );
  return { tokens, user: user.toPublic() };
};

// ─── Refresh Tokens ───────────────────────────────────────────────────────────
export const refreshTokens = async (
  incomingRefreshToken: string,
): Promise<TokenPair> => {
  // rotateAndIssueTokenPair handles reuse detection + rotation internally
  return rotateAndIssueTokenPair(incomingRefreshToken, async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw unauthorized("User not found");
    return { email: user.email, name: user.name };
  });
};

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logout = async (
  accessJti: string,
  accessExp: number,
  refreshToken?: string,
): Promise<void> => {
  await revokeAccessToken(accessJti, accessExp);

  if (refreshToken) {
    // Import lazily to avoid circular dep
    const { extractRefreshPayload, revokeFamily } =
      await import("./token.service");
    try {
      const payload = extractRefreshPayload(refreshToken);
      await revokeFamily(payload.jti);
    } catch {
      // Ignore — token may already be expired or invalid
    }
  }
};

export const logoutAllDevices = async (userId: string): Promise<void> => {
  await revokeAllUserSessions(userId);
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
export const forgotPassword = async (
  input: ForgotPasswordInput,
): Promise<void> => {
  const user = await User.findByEmail(input.email);
  if (!user) return; // Don't reveal whether email exists

  const otp = await generateEmailOtp(user.email, "reset-password");
  await sendPasswordResetEmail(user.email, user.name, otp);
};

// ─── Reset Password ───────────────────────────────────────────────────────────
export const resetPassword = async (
  input: ResetPasswordInput,
): Promise<void> => {
  await verifyEmailOtp(input.email, "reset-password", input.otp);

  const user = await User.findByEmail(input.email);
  if (!user) throw notFound("User not found");

  user.passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  await user.save();

  // Revoke all existing sessions (force re-login everywhere)
  await revokeAllUserSessions(user._id.toString());
};

// ─── OAuth — Initiate ─────────────────────────────────────────────────────────
export const getOAuthRedirectUrl = async (
  provider: "google" | "github",
  redirectTo = "/",
): Promise<string> => {
  const state = await generateOAuthState(provider, redirectTo);
  return provider === "google"
    ? buildGoogleAuthUrl(state)
    : await buildGithubAuthUrl(state);
};

// ─── OAuth — Callback ────────────────────────────────────────────────────────
export const handleOAuthCallback = async (
  provider: "google" | "github",
  code: string,
  state: string,
): Promise<{
  tokens: TokenPair;
  user: PublicUser;
  isNew: boolean;
  redirectTo: string;
}> => {
  // Validate CSRF state and bind it to provider + stored redirect
  const stored = await consumeOAuthState(state);
  if (stored.provider !== provider) {
    throw unauthorized("OAuth provider mismatch");
  }

  // Exchange code for profile
  const { accessToken, refreshToken, profile } =
    provider === "google"
      ? await exchangeGoogleCode(code)
      : await exchangeGithubCode(code, stored.codeVerifier);

  const result = await upsertOAuthUser(profile, accessToken, refreshToken);
  return { ...result, redirectTo: stored.redirectTo };
};

// ─── OAuth — Upsert User ──────────────────────────────────────────────────────
const upsertOAuthUser = async (
  profile: OAuthProfile,
  accessToken: string,
  refreshToken: string | null,
): Promise<{ tokens: TokenPair; user: PublicUser; isNew: boolean }> => {
  // Check if this OAuth account already exists
  const existingAccount = await OAuthAccount.findByProvider(
    profile.provider,
    profile.providerId,
  );

  if (existingAccount) {
    // Update provider tokens
    await OAuthAccount.findByIdAndUpdate(existingAccount._id, {
      accessToken,
      refreshToken,
    });

    const user = await User.findById(existingAccount.userId);
    if (!user) throw unauthorized("Linked user not found");

    const tokens = await issueTokenPair(
      user._id.toString(),
      user.email,
      user.name,
    );
    return { tokens, user: user.toPublic(), isNew: false };
  }

  // No existing OAuth account — find or create a User
  let user = await User.findByEmail(profile.email);
  let isNew = false;

  if (!user) {
    user = await User.create({
      name: profile.name,
      email: profile.email,
      authMethod: profile.provider,
      emailVerified: true, // OAuth providers guarantee email ownership
    });
    isNew = true;
  }

  // Link OAuth account to user
  await OAuthAccount.create({
    userId: user._id,
    provider: profile.provider,
    providerId: profile.providerId,
    accessToken,
    refreshToken,
  });

  const tokens = await issueTokenPair(
    user._id.toString(),
    user.email,
    user.name,
  );
  return { tokens, user: user.toPublic(), isNew };
};

// ─── TOTP — Setup ─────────────────────────────────────────────────────────────
export const initTotpSetup = async (
  userId: string,
): Promise<{ qrCodeDataUrl: string; secret: string }> => {
  const user = await User.findById(userId);
  if (!user) throw notFound("User not found");
  if (user.totpEnabled) throw conflict("TOTP is already enabled");

  const secret = generateTotpSecret();
  const qrCodeDataUrl = await generateTotpQrCode(secret, user.email);

  // Store as pending — only promoted to active after user confirms
  user.totpSecretPending = secret;
  await user.save();

  return { qrCodeDataUrl, secret };
};

export const confirmTotpSetup = async (
  userId: string,
  input: TotpEnableInput,
): Promise<void> => {
  const user = await User.findById(userId).select("+totpSecretPending");
  if (!user) throw notFound("User not found");
  if (!user.totpSecretPending) throw conflict("No pending TOTP setup found");

  const valid = verifyTotpToken(user.totpSecretPending, input.token);
  if (!valid) throw unauthorized("Invalid TOTP code — setup not confirmed");

  user.totpSecret = user.totpSecretPending;
  user.totpSecretPending = null;
  user.totpEnabled = true;
  await user.save();
};

export const disableTotp = async (
  userId: string,
  input: TotpDisableInput,
): Promise<void> => {
  const user = await User.findById(userId).select("+totpSecret");
  if (!user) throw notFound("User not found");
  if (!user.totpEnabled || !user.totpSecret)
    throw conflict("TOTP is not enabled");

  const valid = verifyTotpToken(user.totpSecret, input.token);
  if (!valid) throw unauthorized("Invalid TOTP code");

  user.totpSecret = null;
  user.totpSecretPending = null;
  user.totpEnabled = false;
  await user.save();
};

// ─── Get Current User ─────────────────────────────────────────────────────────
export const getMe = async (userId: string): Promise<PublicUser> => {
  const user = await User.findById(userId);
  if (!user) throw notFound("User not found");
  return user.toPublic();
};
