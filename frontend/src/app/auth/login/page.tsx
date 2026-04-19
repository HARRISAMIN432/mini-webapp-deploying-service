"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthInputField } from "@/components/auth/AuthInputField";
import { EyeToggle } from "@/components/auth/EyeToggle";
import { apiRequest, ApiError } from "@/lib/api";
import type { LoginResponse } from "@/lib/types/auth";

type LoginFormData = LoginFormValues;

type OtpStep =
  | { kind: "none" }
  | { kind: "totp"; email: string }
  | { kind: "emailOtp"; email: string };

/* ── Shared error banner ── */
function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-3 p-3.5 rounded-xl text-sm"
      style={{
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.2)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-red-400">{message}</p>
    </div>
  );
}

/* ── Shared submit button ── */
function SubmitButton({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative w-full h-11 rounded-xl text-sm font-semibold text-white overflow-hidden transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        boxShadow: loading
          ? "none"
          : "0 0 0 1px rgba(99,102,241,0.5), 0 4px 24px rgba(99,102,241,0.25)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* shimmer */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
        }}
      />
      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {loadingLabel}
          </>
        ) : (
          <>
            {label}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
          </>
        )}
      </span>
    </button>
  );
}

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

  useEffect(() => {
    if (otpStep.kind === "totp")
      totpForm.reset({ email: otpStep.email, token: "" });
  }, [otpStep, totpForm]);

  useEffect(() => {
    if (otpStep.kind === "emailOtp")
      emailOtpForm.reset({ email: otpStep.email, otp: "" });
  }, [otpStep, emailOtpForm]);

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
      setFormState({ status: "success", message: "Logged in successfully!" });
      router.push("/dashboard");
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      setFormState({
        status: "error",
        message: err?.message ?? "Invalid email or password. Please try again.",
      });
    }
  };

  const onTotpSubmit = async (values: TotpLoginFormValues) => {
    try {
      setFormState({ status: "loading" });
      await apiRequest("/api/auth/login/totp", {
        method: "POST",
        body: JSON.stringify({ email: values.email, token: values.token }),
      });
      setFormState({ status: "success", message: "Logged in successfully!" });
      router.push("/dashboard");
    } catch (e) {
      setFormState({
        status: "error",
        message:
          e instanceof ApiError ? e.message : "Invalid code. Please try again.",
      });
    }
  };

  const onEmailOtpSubmit = async (values: EmailOtpLoginFormValues) => {
    try {
      setFormState({ status: "loading" });
      await apiRequest("/api/auth/login/email-otp", {
        method: "POST",
        body: JSON.stringify({ email: values.email, otp: values.otp }),
      });
      setFormState({ status: "success", message: "Logged in successfully!" });
      router.push("/dashboard");
    } catch (e) {
      setFormState({
        status: "error",
        message:
          e instanceof ApiError ? e.message : "Invalid code. Please try again.",
      });
    }
  };

  const isLoading = formState.status === "loading";

  /* ── OTP: TOTP ── */
  if (otpStep.kind === "totp") {
    return (
      <div className="space-y-7">
        <div>
          <div
            className="inline-flex items-center justify-center w-11 h-11 rounded-2xl mb-5"
            style={{
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.25)",
            }}
          >
            <svg
              className="w-5 h-5 text-indigo-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 018 0v4" />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold text-white tracking-tight mb-1"
            style={{
              fontFamily: "'Sora', sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            Two-factor auth
          </h1>
          <p
            className="text-[#6b7280] text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Enter the 6-digit code from your authenticator app for{" "}
            <span className="text-[#9ca3af]">{otpStep.email}</span>
          </p>
        </div>

        {formState.status === "error" && (
          <ErrorBanner message={formState.message} />
        )}

        <form
          onSubmit={totpForm.handleSubmit(onTotpSubmit)}
          className="space-y-4"
          noValidate
        >
          <input type="hidden" {...totpForm.register("email")} />
          <AuthInputField
            control={totpForm.control}
            name="token"
            label="6-digit code"
            placeholder="000 000"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <SubmitButton
            loading={isLoading}
            label="Verify & sign in"
            loadingLabel="Verifying…"
          />
        </form>

        <button
          type="button"
          onClick={() => {
            setOtpStep({ kind: "none" });
            setFormState({ status: "idle" });
          }}
          className="flex items-center gap-1.5 text-sm text-[#4b5563] hover:text-[#9ca3af] transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to password
        </button>
      </div>
    );
  }

  /* ── OTP: Email ── */
  if (otpStep.kind === "emailOtp") {
    return (
      <div className="space-y-7">
        <div>
          <div
            className="inline-flex items-center justify-center w-11 h-11 rounded-2xl mb-5"
            style={{
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.25)",
            }}
          >
            <svg
              className="w-5 h-5 text-indigo-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold text-white tracking-tight mb-1"
            style={{
              fontFamily: "'Sora', sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            Check your email
          </h1>
          <p
            className="text-[#6b7280] text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            We sent a code to{" "}
            <span className="text-[#9ca3af]">{otpStep.email}</span>
          </p>
        </div>

        {formState.status === "error" && (
          <ErrorBanner message={formState.message} />
        )}

        <form
          onSubmit={emailOtpForm.handleSubmit(onEmailOtpSubmit)}
          className="space-y-4"
          noValidate
        >
          <input type="hidden" {...emailOtpForm.register("email")} />
          <AuthInputField
            control={emailOtpForm.control}
            name="otp"
            label="6-digit code"
            placeholder="000 000"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <SubmitButton
            loading={isLoading}
            label="Verify & sign in"
            loadingLabel="Verifying…"
          />
        </form>

        <button
          type="button"
          onClick={() => {
            setOtpStep({ kind: "none" });
            setFormState({ status: "idle" });
          }}
          className="flex items-center gap-1.5 text-sm text-[#4b5563] hover:text-[#9ca3af] transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to password
        </button>
      </div>
    );
  }

  /* ── Main login form ── */
  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-white tracking-tight mb-1"
          style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}
        >
          Welcome back
        </h1>
        <p
          className="text-[#6b7280] text-sm"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Sign in to your ShipStack workspace
        </p>
      </div>

      <OAuthButtons mode="login" />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span
          className="text-[#374151] text-xs uppercase tracking-widest"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          or
        </span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      {formState.status === "error" && (
        <div className="space-y-2">
          <ErrorBanner message={formState.message} />
          {formState.message.toLowerCase().includes("verify") && (
            <Link
              href={`/auth/verify-email?email=${encodeURIComponent(form.watch("email"))}`}
              className="block text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Open email verification →
            </Link>
          )}
        </div>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
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
            <Checkbox
              checked={form.watch("rememberMe")}
              onCheckedChange={(checked) =>
                form.setValue("rememberMe", checked as boolean)
              }
              className="border-white/[0.15] data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 rounded-md"
            />
            <span
              className="text-[#6b7280] text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Remember me
            </span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Forgot password?
          </Link>
        </div>

        <SubmitButton
          loading={isLoading}
          label="Sign in"
          loadingLabel="Signing in…"
        />
      </form>

      <p
        className="text-center text-sm text-[#4b5563]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/sign-up"
          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          Create one free
        </Link>
      </p>
    </div>
  );
}
