"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";

import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validations/auth";
import { AuthFormState } from "@/lib/types/auth";
import { apiRequest, ApiError } from "@/lib/api";
import { AuthInputField } from "@/components/auth/AuthInputField";

export default function ForgotPasswordPage() {
  const [formState, setFormState] = useState<AuthFormState>({ status: "idle" });

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      setFormState({ status: "loading" });
      await apiRequest<null>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setFormState({
        status: "success",
        message: `If this email is registered, we've sent a 6-digit reset code to ${values.email}.`,
      });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : "Something went wrong. Please try again.";
      setFormState({
        status: "error",
        message: msg,
      });
    }
  };

  const isLoading = formState.status === "loading";
  const isSuccess = formState.status === "success";

  // ── Success state ──────────────────────────────────────────────────────────
  if (isSuccess) {
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
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.95 10.83a19.79 19.79 0 01-3.07-8.67A2 2 0 012.86 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.7 7.95a16 16 0 006.29 6.29l1.31-1.31a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" />
          </svg>
        </div>

        <div>
          <h2
            className="text-xl font-bold text-white mb-2"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Check your inbox
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            {formState.message}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href={`/auth/reset-password?email=${encodeURIComponent(form.getValues("email"))}`}
            className="flex items-center justify-center w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition-colors"
          >
            Enter code &amp; new password
          </Link>
          <Button
            onClick={() => {
              form.reset();
              setFormState({ status: "idle" });
            }}
            variant="outline"
            className="w-full h-11 border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 rounded-xl"
          >
            Try a different email
          </Button>
          <Link
            href="/auth/login"
            className="block text-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Form state ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm transition-colors mb-6"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to sign in
        </Link>

        <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-blue-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>

        <h1
          className="text-2xl font-bold text-white tracking-tight mb-1"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Reset your password
        </h1>
        <p className="text-gray-500 text-sm">
          Enter your email and we&apos;ll send a 6-digit reset code.
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
        <AuthInputField
          control={form.control}
          name="email"
          label="Email address"
          placeholder="you@company.com"
          type="email"
          autoComplete="email"
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
              Sending…
            </span>
          ) : (
            "Send reset code"
          )}
        </Button>
      </form>
    </div>
  );
}
