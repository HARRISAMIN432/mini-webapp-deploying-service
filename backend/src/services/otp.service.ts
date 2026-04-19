import crypto from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { redis } from "../config/redis";
import { env } from "../config/env";
import { otpInvalid } from "../utils/errors";
import { logger } from "../utils/logger";

// ─── Key Prefixes ─────────────────────────────────────────────────────────────
const OTP_PREFIX = "otp:";
const OTP_ATTEMPTS = "otp:attempts:";
const MAX_OTP_ATTEMPTS = 5;

// ─── Email OTP ────────────────────────────────────────────────────────────────

/**
 * Generates a 6-digit numeric OTP, stores it in Redis, and returns it.
 * Purpose can be: "verify-email" | "login-otp" | "reset-password"
 */
export const generateEmailOtp = async (
  email: string,
  purpose: string,
): Promise<string> => {
  const otp = crypto.randomInt(100_000, 999_999).toString();
  const key = `${OTP_PREFIX}${purpose}:${email}`;
  const ttl = env.OTP_EXPIRES_MINUTES * 60;

  // Store hashed OTP to avoid leaking raw OTP from Redis
  const hash = crypto.createHash("sha256").update(otp).digest("hex");
  await redis.setex(key, ttl, hash);

  // Reset attempt counter
  await redis.del(`${OTP_ATTEMPTS}${purpose}:${email}`);

  logger.debug("OTP generated", { email, purpose });
  return otp;
};

/**
 * Verifies an OTP. Enforces rate-limiting (5 wrong attempts → OTP revoked).
 * Deletes the OTP on success (single-use).
 */
export const verifyEmailOtp = async (
  email: string,
  purpose: string,
  otp: string,
): Promise<void> => {
  const key = `${OTP_PREFIX}${purpose}:${email}`;
  const attemptsKey = `${OTP_ATTEMPTS}${purpose}:${email}`;

  const storedHash = await redis.get(key);
  if (!storedHash) throw otpInvalid("OTP has expired or does not exist");

  const attempts = await redis.incr(attemptsKey);
  if (attempts > MAX_OTP_ATTEMPTS) {
    await redis.del(key);
    throw otpInvalid("Too many invalid attempts. Please request a new OTP.");
  }

  const inputHash = crypto.createHash("sha256").update(otp).digest("hex");
  const valid = crypto.timingSafeEqual(
    Buffer.from(storedHash, "hex"),
    Buffer.from(inputHash, "hex"),
  );

  if (!valid) throw otpInvalid("Invalid OTP");

  // Single use — delete on success
  await redis.del(key);
  await redis.del(attemptsKey);
};

// ─── TOTP (Time-based 2FA) ────────────────────────────────────────────────────

export const generateTotpSecret = (): string =>
  generateSecret({ length: 20 });

export const generateTotpUri = (secret: string, email: string): string =>
  generateURI({
    issuer: env.TOTP_ISSUER,
    label: email,
    secret,
  });

export const generateTotpQrCode = async (
  secret: string,
  email: string,
): Promise<string> => {
  const uri = generateTotpUri(secret, email);
  return QRCode.toDataURL(uri);
};

export const verifyTotpToken = (secret: string, token: string): boolean => {
  const result = verifySync({
    secret,
    token,
    epochTolerance: 30, // ±1 step @ 30s period
  });
  return result.valid;
};

// ─── Secure Token for Email Links ────────────────────────────────────────────
// Used for: email verification links, password reset links

const TOKEN_PREFIX = "secure-token:";

export const generateSecureToken = async (
  purpose: string,
  payload: string,
  ttlSeconds = 3600, // 1 hour default
): Promise<string> => {
  const token = crypto.randomBytes(32).toString("hex");
  const key = `${TOKEN_PREFIX}${purpose}:${token}`;
  await redis.setex(key, ttlSeconds, payload);
  return token;
};

export const consumeSecureToken = async (
  purpose: string,
  token: string,
): Promise<string> => {
  const key = `${TOKEN_PREFIX}${purpose}:${token}`;
  const payload = await redis.get(key);
  if (!payload) throw otpInvalid("Token is invalid or has expired");
  await redis.del(key); // single-use
  return payload;
};
