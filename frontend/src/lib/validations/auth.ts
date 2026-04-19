import { z } from "zod";

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

const otpSchema = z
  .string()
  .length(6, "Code must be 6 digits")
  .regex(/^\d{6}$/, "Digits only");

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(64, "Name is too long")
  .trim();

// ─── Form schemas ────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

export const signUpSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const verifyEmailFormSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    otp: otpSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const totpLoginSchema = z.object({
  email: emailSchema,
  token: otpSchema,
});

export const emailOtpLoginSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

export type LoginFormValues = z.infer<typeof loginSchema> & {
  rememberMe: boolean;
};
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailFormValues = z.infer<typeof verifyEmailFormSchema>;
export type TotpLoginFormValues = z.infer<typeof totpLoginSchema>;
export type EmailOtpLoginFormValues = z.infer<typeof emailOtpLoginSchema>;
