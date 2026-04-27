// app/auth/forgot-password/page.tsx
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

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Check your inbox
          </h1>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {formState.message}
          </p>
        </div>
        <div className="space-y-3">
          <Link
            href={`/auth/reset-password?email=${encodeURIComponent(form.getValues("email"))}`}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors"
          >
            Enter reset code
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => {
              form.reset();
              setFormState({ status: "idle" });
            }}
            className="w-full h-11 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Try a different email
          </button>
        </div>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </Link>

      <div>
        <div className="w-11 h-11 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center mb-4">
          <Mail className="w-5 h-5 text-violet-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Reset your password
        </h1>
        <p className="text-sm text-gray-500">
          Enter your email and we'll send you a 6-digit reset code.
        </p>
      </div>

      {formState.status === "error" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
          {isLoading ? "Sending..." : "Send reset code"}
        </button>
      </form>
    </div>
  );
}
