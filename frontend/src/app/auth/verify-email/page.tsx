"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Mail,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  verifyEmailFormSchema,
  type VerifyEmailFormValues,
} from "@/lib/validations/auth";
import { AuthFormState } from "@/lib/types/auth";
import { AuthInputField } from "@/components/auth/AuthInputField";
import { apiRequest, ApiError } from "@/lib/api";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";

  const [formState, setFormState] = useState<AuthFormState>({ status: "idle" });

  const form = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailFormSchema),
    defaultValues: { email: emailFromQuery, otp: "" },
    mode: "onBlur",
  });

  const onSubmit = async (values: VerifyEmailFormValues) => {
    try {
      setFormState({ status: "loading" });
      await apiRequest<null>("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email: values.email, otp: values.otp }),
      });
      setFormState({
        status: "success",
        message: "Your email is verified. You can sign in.",
      });
      setTimeout(() => router.push("/auth/login"), 1500);
    } catch (e) {
      setFormState({
        status: "error",
        message:
          e instanceof ApiError ? e.message : "Could not verify. Try again.",
      });
    }
  };

  const resend = async () => {
    const email = form.getValues("email");
    if (!email) {
      setFormState({
        status: "error",
        message: "Enter your email above first.",
      });
      return;
    }
    try {
      setFormState({ status: "loading" });
      await apiRequest<null>("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setFormState({
        status: "success",
        message: "If this email is unverified, a new code has been sent.",
      });
    } catch (e) {
      setFormState({
        status: "error",
        message:
          e instanceof ApiError
            ? e.message
            : "Could not resend. Try again later.",
      });
    }
  };

  const isLoading = formState.status === "loading";

  return (
    <div className="space-y-7">
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
          Verify your email
        </h1>
        <p
          className="text-[#6b7280] text-sm"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Enter the 6-digit code we sent to your inbox.
        </p>
      </div>

      {/* Status banners */}
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

      {formState.status === "success" && (
        <div
          className="flex items-start gap-3 p-3.5 rounded-xl text-sm"
          style={{
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-400">{formState.message}</p>
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
          label="Verification code"
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
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
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
              </>
            ) : (
              <>
                Verify email{" "}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </span>
        </button>
      </form>

      {/* Secondary actions */}
      <div className="flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          onClick={resend}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Resend code
        </button>
        <Link
          href="/auth/login"
          className="text-[#4b5563] hover:text-[#6b7280] transition-colors"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
