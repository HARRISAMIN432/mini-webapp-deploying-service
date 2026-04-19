"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token"); // e.g. /auth/reset-password?token=xyz

  const passwordToggle = usePasswordToggle();
  const confirmToggle = usePasswordToggle();
  const [formState, setFormState] = useState<AuthFormState>({ status: "idle" });

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const watchedPassword = form.watch("password");

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      setFormState({
        status: "error",
        message: "Reset token is missing. Please request a new link.",
      });
      return;
    }

    try {
      setFormState({ status: "loading" });

      // TODO: replace with your API call
      // await fetch("/api/auth/reset-password", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ token, password: values.password }),
      // });

      await new Promise((r) => setTimeout(r, 1200)); // placeholder

      setFormState({
        status: "success",
        message: "Password reset successfully!",
      });

      setTimeout(() => router.push("/auth/login"), 2500);
    } catch {
      setFormState({
        status: "error",
        message: "This reset link has expired. Please request a new one.",
      });
    }
  };

  const isLoading = formState.status === "loading";

  // ── Invalid / missing token guard ──────────────────────────────────────────
  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-red-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <h2
            className="text-xl font-bold text-white mb-2"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Invalid reset link
          </h2>
          <p className="text-gray-400 text-sm">
            This link is invalid or has expired.
          </p>
        </div>
        <Link
          href="/auth/forgot-password"
          className="inline-flex items-center justify-center w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all text-sm"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (formState.status === "success") {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-green-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div>
          <h2
            className="text-xl font-bold text-white mb-2"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Password updated
          </h2>
          <p className="text-gray-400 text-sm">
            You&apos;ll be redirected to sign in shortly…
          </p>
        </div>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all text-sm"
        >
          Sign in now
        </Link>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-blue-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h1
          className="text-2xl font-bold text-white tracking-tight mb-1"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Set new password
        </h1>
        <p className="text-gray-500 text-sm">
          Must be at least 8 characters with uppercase, number & symbol.
        </p>
      </div>

      {/* Error banner */}
      {formState.status === "error" && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <svg
            className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-red-400 text-sm">{formState.message}</p>
        </div>
      )}

      {/* Form - removed Form wrapper */}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
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
              Updating password…
            </span>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </div>
  );
}
