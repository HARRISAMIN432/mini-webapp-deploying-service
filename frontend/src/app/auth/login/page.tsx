"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

export default function LoginPage() {
  const router = useRouter();
  const { showPassword, toggle, inputType } = usePasswordToggle();
  const [formState, setFormState] = useState<AuthFormState>({ status: "idle" });
  const [otpStep, setOtpStep] = useState<OtpStep>({ kind: "none" });

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as never,
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
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
    if (otpStep.kind === "totp") {
      totpForm.reset({ email: otpStep.email, token: "" });
    }
  }, [otpStep, totpForm]);

  useEffect(() => {
    if (otpStep.kind === "emailOtp") {
      emailOtpForm.reset({ email: otpStep.email, otp: "" });
    }
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
        if (data.otpMethod === "totp") {
          setOtpStep({ kind: "totp", email: data.user.email });
        } else {
          setOtpStep({ kind: "emailOtp", email: data.user.email });
        }
        return;
      }

      setFormState({ status: "success", message: "Logged in successfully!" });
      router.push("/dashboard");
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      const msg = err?.message ?? "Invalid email or password. Please try again.";
      setFormState({ status: "error", message: msg });
    }
  };

  const onTotpSubmit = async (values: TotpLoginFormValues) => {
    try {
      setFormState({ status: "loading" });
      await apiRequest("/api/auth/login/totp", {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          token: values.token,
        }),
      });
      setFormState({ status: "success", message: "Logged in successfully!" });
      router.push("/dashboard");
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Invalid code. Please try again.";
      setFormState({ status: "error", message: msg });
    }
  };

  const onEmailOtpSubmit = async (values: EmailOtpLoginFormValues) => {
    try {
      setFormState({ status: "loading" });
      await apiRequest("/api/auth/login/email-otp", {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          otp: values.otp,
        }),
      });
      setFormState({ status: "success", message: "Logged in successfully!" });
      router.push("/dashboard");
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Invalid code. Please try again.";
      setFormState({ status: "error", message: msg });
    }
  };

  const isLoading = formState.status === "loading";

  if (otpStep.kind === "totp") {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Authenticator code
          </h1>
          <p className="text-gray-500 text-sm">
            Enter the 6-digit code from your app for{" "}
            <span className="text-gray-400">{otpStep.email}</span>
          </p>
        </div>

        {formState.status === "error" && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm">{formState.message}</p>
          </div>
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
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl"
          >
            {isLoading ? "Verifying…" : "Continue"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => {
            setOtpStep({ kind: "none" });
            setFormState({ status: "idle" });
          }}
          className="w-full text-sm text-gray-500 hover:text-gray-400"
        >
          ← Back to password
        </button>
      </div>
    );
  }

  if (otpStep.kind === "emailOtp") {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1
            className="text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Email code
          </h1>
          <p className="text-gray-500 text-sm">
            Enter the code sent to{" "}
            <span className="text-gray-400">{otpStep.email}</span>
          </p>
        </div>

        {formState.status === "error" && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm">{formState.message}</p>
          </div>
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
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl"
          >
            {isLoading ? "Verifying…" : "Continue"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => {
            setOtpStep({ kind: "none" });
            setFormState({ status: "idle" });
          }}
          className="w-full text-sm text-gray-500 hover:text-gray-400"
        >
          ← Back to password
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1
          className="text-2xl font-bold text-white tracking-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Welcome back
        </h1>
        <p className="text-gray-500 text-sm">
          Sign in to your ShipStack workspace
        </p>
      </div>

      <OAuthButtons mode="login" />

      <AuthDivider label="or continue with email" />

      {formState.status === "error" && (
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm">{formState.message}</p>
          </div>
          {formState.message.toLowerCase().includes("verify") && (
            <Link
              href={`/auth/verify-email?email=${encodeURIComponent(form.watch("email"))}`}
              className="block text-center text-sm text-blue-400 hover:text-blue-300"
            >
              Open email verification
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
          placeholder="••••••••"
          type={inputType}
          autoComplete="current-password"
          rightElement={<EyeToggle show={showPassword} onToggle={toggle} />}
        />

        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={form.watch("rememberMe")}
              onCheckedChange={(checked) =>
                form.setValue("rememberMe", checked as boolean)
              }
              className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <span className="text-gray-400 text-sm font-normal">
              Remember me
            </span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Signing in…
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/sign-up"
          className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          Create one free
        </Link>
      </p>
    </div>
  );
}
