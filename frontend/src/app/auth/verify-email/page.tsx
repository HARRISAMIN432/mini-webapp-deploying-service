"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { verifyEmailFormSchema, type VerifyEmailFormValues } from "@/lib/validations/auth";
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
    defaultValues: {
      email: emailFromQuery,
      otp: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (values: VerifyEmailFormValues) => {
    try {
      setFormState({ status: "loading" });
      await apiRequest<null>("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          otp: values.otp,
        }),
      });
      setFormState({
        status: "success",
        message: "Your email is verified. You can sign in.",
      });
      setTimeout(() => router.push("/auth/login"), 1500);
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Could not verify. Try again.";
      setFormState({ status: "error", message: msg });
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
      const msg =
        e instanceof ApiError ? e.message : "Could not resend. Try again later.";
      setFormState({ status: "error", message: msg });
    }
  };

  const isLoading = formState.status === "loading";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1
          className="text-2xl font-bold text-white tracking-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Verify your email
        </h1>
        <p className="text-gray-500 text-sm">
          Enter the 6-digit code we sent to your inbox.
        </p>
      </div>

      {formState.status === "error" && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{formState.message}</p>
        </div>
      )}

      {formState.status === "success" && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-green-400 text-sm">{formState.message}</p>
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

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-60"
        >
          {isLoading ? "Verifying…" : "Verify email"}
        </Button>
      </form>

      <div className="flex flex-col gap-2 text-center text-sm">
        <button
          type="button"
          onClick={resend}
          disabled={isLoading}
          className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
        >
          Resend code
        </button>
        <Link
          href="/auth/login"
          className="text-gray-500 hover:text-gray-400"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
