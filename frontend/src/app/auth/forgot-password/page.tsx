"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  AlertCircle,
  Mail,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";

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
      setFormState({
        status: "error",
        message:
          e instanceof ApiError
            ? e.message
            : "Something went wrong. Please try again.",
      });
    }
  };

  const isLoading = formState.status === "loading";
  const isSuccess = formState.status === "success";

  /* ── Success state ── */
  if (isSuccess) {
    return (
      <div className="space-y-7 text-center">
        {/* Icon */}
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
            Check your inbox
          </h2>
          <p
            className="text-[#6b7280] text-sm leading-relaxed max-w-[280px]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {formState.message}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href={`/auth/reset-password?email=${encodeURIComponent(form.getValues("email"))}`}
            className="group relative flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold text-white overflow-hidden transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow:
                "0 0 0 1px rgba(99,102,241,0.5), 0 4px 24px rgba(99,102,241,0.25)",
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
            <span className="relative flex items-center gap-2">
              Enter code &amp; new password
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          <button
            onClick={() => {
              form.reset();
              setFormState({ status: "idle" });
            }}
            className="w-full h-11 rounded-xl text-sm font-medium text-[#6b7280] hover:text-[#9ca3af] transition-colors"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Try a different email
          </button>

          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-1.5 text-sm text-[#4b5563] hover:text-[#6b7280] transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  /* ── Form state ── */
  return (
    <div className="space-y-7">
      {/* Back link */}
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1.5 text-sm text-[#4b5563] hover:text-[#9ca3af] transition-colors"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </Link>

      {/* Header */}
      <div>
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.25)",
          }}
        >
          <Mail className="w-5 h-5 text-indigo-400" />
        </div>
        <h1
          className="text-2xl font-bold text-white tracking-tight mb-1"
          style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}
        >
          Reset your password
        </h1>
        <p
          className="text-[#6b7280] text-sm"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Enter your email and we&apos;ll send a 6-digit reset code.
        </p>
      </div>

      {/* Error banner */}
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
                <Loader2 className="w-4 h-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                Send reset code{" "}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </span>
        </button>
      </form>
    </div>
  );
}
