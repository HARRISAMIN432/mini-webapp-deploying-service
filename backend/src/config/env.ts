import { z } from "zod";

const envSchema = z.object({
  // ── Server ─────────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().url(),

  // ── MongoDB ───────────────────────────────────────────────────────────────
  MONGODB_URI: z.string().url(),

  // ── Redis ─────────────────────────────────────────────────────────────────
  REDIS_URL: z.string().url(),

  // ── JWT ───────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z.string().min(64),
  JWT_REFRESH_SECRET: z.string().min(64),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  // ── Google OAuth ──────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string().url(),

  // ── GitHub OAuth ──────────────────────────────────────────────────────────
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_CALLBACK_URL: z.string().url(),

  // ── Email / SMTP ──────────────────────────────────────────────────────────
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  EMAIL_FROM: z.string().email(),

  // ── OTP / TOTP ────────────────────────────────────────────────────────────
  OTP_EXPIRES_MINUTES: z.coerce.number().default(10),
  TOTP_ISSUER: z.string().default("ShipStack"),

  // ── Security ──────────────────────────────────────────────────────────────
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

// Validate on startup — crashes fast if misconfigured
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌  Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
