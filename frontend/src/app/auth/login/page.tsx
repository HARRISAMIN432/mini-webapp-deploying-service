"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, ArrowRight } from "lucide-react";

import {
  loginSchema,
  totpLoginSchema,
  emailOtpLoginSchema,
  type TotpLoginFormValues,
  type EmailOtpLoginFormValues,
} from "@/lib/validations/auth";
import type { LoginFormValues } from "@/lib/validations/auth";
import { AuthFormState } from "@/lib/types/auth";
import { usePasswordToggle } from "@/lib/hooks/usePasswordToggle";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { AuthInputField } from "@/components/auth/AuthInputField";
import { EyeToggle } from "@/components/auth/EyeToggle";
import { apiRequest, ApiError, setAccessToken } from "@/lib/api";
import type { LoginResponse } from "@/lib/types/auth";

type LoginFormData = LoginFormValues;

type OtpStep =
  | { kind: "none" }
  | { kind: "totp"; email: string }
  | { kind: "emailOtp"; email: string };

export default function LoginPage() {
  const router = useRouter();
  const { showPassword, toggle, inputType } = usePasswordToggle();
  const [formState, setFormState] = useState<AuthFormState>({ status: "idle" });
  const [otpStep, setOtpStep] = useState<OtpStep>({ kind: "none" });

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as never,
    defaultValues: { email: "", password: "", rememberMe: false },
    mode: "onBlur",
  });

  const totpForm = useForm<TotpLoginFormValues>({
    resolver: zodResolver(totpLoginSchema),
    defaultValues: { email: "", token: "" },
  });

  const emailOtpForm = useForm<EmailOtpLoginFormValues>({
    resolver: zodResolver(emailOtpLoginSchema),
    defaultValues: { email: "", otp: "" },
  });

  const onSubmit = async (values: LoginFormData) => {
    try {
      setFormState({ status: "loading" });
      const data = await apiRequest<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      if ("requiresOtp" in data && data.requiresOtp) {
        setFormState({ status: "idle" });
        if (data.otpMethod === "totp")
          setOtpStep({ kind: "totp", email: data.user.email });
        else setOtpStep({ kind: "emailOtp", email: data.user.email });
        return;
      }
      if ("tokens" in data) setAccessToken(data.tokens.accessToken);
      router.push("/dashboard");
    } catch (e) {
      setFormState({
        status: "error",
        message:
          e instanceof ApiError ? e.message : "Invalid email or password",
      });
    }
  };

  const onTotpSubmit = async (values: TotpLoginFormValues) => {
    try {
      setFormState({ status: "loading" });
      const data = await apiRequest<{ tokens: { accessToken: string } }>(
        "/api/auth/login/totp",
        {
          method: "POST",
          body: JSON.stringify({ email: values.email, token: values.token }),
        },
      );
      setAccessToken(data.tokens.accessToken);
      router.push("/dashboard");
    } catch (e) {
      setFormState({
        status: "error",
        message: e instanceof ApiError ? e.message : "Invalid code",
      });
    }
  };

  const onEmailOtpSubmit = async (values: EmailOtpLoginFormValues) => {
    try {
      setFormState({ status: "loading" });
      const data = await apiRequest<{ tokens: { accessToken: string } }>(
        "/api/auth/login/email-otp",
        {
          method: "POST",
          body: JSON.stringify({ email: values.email, otp: values.otp }),
        },
      );
      setAccessToken(data.tokens.accessToken);
      router.push("/dashboard");
    } catch (e) {
      setFormState({
        status: "error",
        message: e instanceof ApiError ? e.message : "Invalid code",
      });
    }
  };

  const isLoading = formState.status === "loading";

  // TOTP Step
  if (otpStep.kind === "totp") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Two-factor authentication
          </h1>
          <p className="text-sm text-gray-500">
            Enter the code from your authenticator app for{" "}
            <span className="font-medium text-gray-700">{otpStep.email}</span>
          </p>
        </div>

        {formState.status === "error" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {formState.message}
          </div>
        )}

        <form
          onSubmit={totpForm.handleSubmit(onTotpSubmit)}
          className="space-y-4"
        >
          <input type="hidden" {...totpForm.register("email")} />
          <AuthInputField
            control={totpForm.control}
            name="token"
            label="Authentication code"
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {isLoading ? "Verifying..." : "Verify & sign in"}
          </button>
        </form>

        <button
          onClick={() => {
            setOtpStep({ kind: "none" });
            setFormState({ status: "idle" });
          }}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Back to password
        </button>
      </div>
    );
  }

  // Email OTP Step
  if (otpStep.kind === "emailOtp") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Check your email
          </h1>
          <p className="text-sm text-gray-500">
            We sent a code to{" "}
            <span className="font-medium text-gray-700">{otpStep.email}</span>
          </p>
        </div>

        {formState.status === "error" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {formState.message}
          </div>
        )}

        <form
          onSubmit={emailOtpForm.handleSubmit(onEmailOtpSubmit)}
          className="space-y-4"
        >
          <input type="hidden" {...emailOtpForm.register("email")} />
          <AuthInputField
            control={emailOtpForm.control}
            name="otp"
            label="Verification code"
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {isLoading ? "Verifying..." : "Verify & sign in"}
          </button>
        </form>

        <button
          onClick={() => {
            setOtpStep({ kind: "none" });
            setFormState({ status: "idle" });
          }}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Back to password
        </button>
      </div>
    );
  }

  // Main login form
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500">
          Sign in to your ShipStack account
        </p>
      </div>

      <OAuthButtons mode="login" />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium uppercase">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {formState.status === "error" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {formState.message}
          </div>
          {formState.message.toLowerCase().includes("verify") && (
            <Link
              href={`/auth/verify-email?email=${encodeURIComponent(form.watch("email"))}`}
              className="block text-center text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              Verify your email →
            </Link>
          )}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <AuthInputField
          control={form.control}
          name="email"
          label="Email address"
          placeholder="you@company.com"
          type="email"
          autoComplete="email"
        />

        <AuthInputField
          control={form.control}
          name="password"
          label="Password"
          placeholder="Enter your password"
          type={inputType}
          autoComplete="current-password"
          rightElement={<EyeToggle show={showPassword} onToggle={toggle} />}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.watch("rememberMe")}
              onChange={(e) => form.setValue("rememberMe", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm text-gray-600">Remember me</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-violet-600 hover:text-violet-700 font-medium"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Don't have an account?{" "}
        <Link
          href="/auth/sign-up"
          className="text-violet-600 hover:text-violet-700 font-medium"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
