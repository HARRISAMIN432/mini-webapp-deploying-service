"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/validations/auth";
import { AuthFormState } from "@/lib/types/auth";
import { usePasswordToggle } from "@/lib/hooks/usePasswordToggle";
import { AuthInputField } from "@/components/auth/AuthInputField";
import { EyeToggle } from "@/components/auth/EyeToggle";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { apiRequest, ApiError } from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailPrefill = searchParams.get("email") ?? "";

  const passwordToggle = usePasswordToggle();
  const confirmToggle = usePasswordToggle();
  const [formState, setFormState] = useState<AuthFormState>({ status: "idle" });

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailPrefill,
      otp: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (emailPrefill) form.setValue("email", emailPrefill);
  }, [emailPrefill, form]);

  const watchedPassword = form.watch("password");

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      setFormState({ status: "loading" });
      await apiRequest<null>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setFormState({
        status: "success",
        message: "Password updated successfully!",
      });
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (e) {
      setFormState({
        status: "error",
        message:
          e instanceof ApiError
            ? e.message
            : "Could not reset password. Try again or request a new code.",
      });
    }
  };

  const isLoading = formState.status === "loading";

  /* ── Success ── */
  if (formState.status === "success") {
    return (
      <div className="space-y-7 text-center">
        <div className="flex flex-col items-center">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mb-5"
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.2)",
              boxShadow: "0 0 40px rgba(34,197,94,0.1)",
            }}
          >
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2
            className="text-2xl font-bold text-white tracking-tight mb-2"
            style={{
              fontFamily: "'Sora', sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            Password updated
          </h2>
          <p
            className="text-[#6b7280] text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            You&apos;ll be redirected to sign in shortly…
          </p>
        </div>

        <Link
          href="/auth/login"
          className="group relative flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold text-white overflow-hidden transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow:
              "0 0 0 1px rgba(99,102,241,0.5), 0 4px 24px rgba(99,102,241,0.25)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Sign in now <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="space-y-7">
      <div>
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.25)",
          }}
        >
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
        </div>
        <h1
          className="text-2xl font-bold text-white tracking-tight mb-1"
          style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}
        >
          Set new password
        </h1>
        <p
          className="text-[#6b7280] text-sm"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Enter the code from your email, then choose a new password.
        </p>
      </div>

      {formState.status === "error" && (
        <div
          className="flex items-start gap-3 p-3.5 rounded-xl text-sm"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400">{formState.message}</p>
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
          name="otp"
          label="Reset code"
          placeholder="000000"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
        />

        <div>
          <AuthInputField
            control={form.control}
            name="password"
            label="New password"
            placeholder="Min. 8 characters"
            type={passwordToggle.inputType}
            autoComplete="new-password"
            rightElement={
              <EyeToggle
                show={passwordToggle.showPassword}
                onToggle={passwordToggle.toggle}
              />
            }
          />
          <PasswordStrength password={watchedPassword} />
        </div>

        <AuthInputField
          control={form.control}
          name="confirmPassword"
          label="Confirm new password"
          placeholder="Repeat your password"
          type={confirmToggle.inputType}
          autoComplete="new-password"
          rightElement={
            <EyeToggle
              show={confirmToggle.showPassword}
              onToggle={confirmToggle.toggle}
            />
          }
        />

        <button
          type="submit"
          disabled={isLoading}
          className="group relative w-full h-11 rounded-xl text-sm font-semibold text-white overflow-hidden transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: isLoading
              ? "none"
              : "0 0 0 1px rgba(99,102,241,0.5), 0 4px 24px rgba(99,102,241,0.25)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background:
                "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
            }}
          />
          <span className="relative flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Updating password…
              </>
            ) : (
              <>
                Update password{" "}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </span>
        </button>
      </form>

      <p
        className="text-center text-sm text-[#4b5563]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <Link
          href="/auth/forgot-password"
          className="text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Request a new code
        </Link>
      </p>
    </div>
  );
}
