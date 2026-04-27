// app/auth/verify-email/page.tsx
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
    <div className="space-y-6">
      <div>
        <div className="w-11 h-11 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center mb-4">
          <Mail className="w-5 h-5 text-violet-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Verify your email
        </h1>
        <p className="text-sm text-gray-500">
          Enter the 6-digit code we sent to your inbox.
        </p>
      </div>

      {formState.status === "error" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {formState.message}
        </div>
      )}

      {formState.status === "success" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {formState.message}
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
          className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          {isLoading ? "Verifying..." : "Verify email"}
        </button>
      </form>

      <div className="flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          onClick={resend}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 text-violet-600 hover:text-violet-700 font-medium transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Resend code
        </button>
        <Link
          href="/auth/login"
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
