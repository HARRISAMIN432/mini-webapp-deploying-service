import { z } from "zod";

const emailField = z
  .string()
  .email("Invalid email address")
  .toLowerCase()
  .trim();

const passwordField = z
  .string()
  .min(8, "Minimum 8 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^A-Za-z0-9]/, "Must contain a special character");

const otpField = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^\d{6}$/, "OTP must be numeric");

// ─── Schemas ──────────────────────────────────────────────────────────────────
export const registerSchema = z
  .object({
    name: z.string().min(2).max(100).trim(),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      message: "You must accept the terms",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({ email: emailField });

// Reset uses email + OTP (matches the OTP-based email flow)
export const resetPasswordSchema = z
  .object({
    email: emailField,
    otp: otpField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resendVerificationSchema = z.object({ email: emailField });

export const verifyEmailSchema = z.object({
  email: emailField,
  otp: otpField,
});

export const verifyOtpSchema = z.object({
  email: emailField,
  otp: otpField,
});

export const totpVerifySchema = z.object({
  email: emailField,
  token: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});

export const totpEnableSchema = z.object({
  token: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});

export const totpDisableSchema = z.object({
  token: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type TotpVerifyInput = z.infer<typeof totpVerifySchema>;
export type TotpEnableInput = z.infer<typeof totpEnableSchema>;
export type TotpDisableInput = z.infer<typeof totpDisableSchema>;
