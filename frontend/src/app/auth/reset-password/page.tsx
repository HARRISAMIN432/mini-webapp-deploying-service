// app/auth/reset-password/page.tsx
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

  if (formState.status === "success") {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Password updated
          </h1>
          <p className="text-sm text-gray-500">Redirecting to sign in...</p>
        </div>
        <Link
          href="/auth/login"
          className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors"
        >
          Sign in now
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="w-11 h-11 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center mb-4">
          <ShieldCheck className="w-5 h-5 text-violet-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Set new password
        </h1>
        <p className="text-sm text-gray-500">
          Enter the code from your email, then choose a new password.
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
          className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          {isLoading ? "Updating..." : "Update password"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        <Link
          href="/auth/forgot-password"
          className="text-violet-600 hover:text-violet-700 font-medium"
        >
          Request a new code
        </Link>
      </p>
    </div>
  );
}
