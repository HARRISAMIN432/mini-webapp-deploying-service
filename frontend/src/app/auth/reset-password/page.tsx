"use client";

import { useEffect, useState } from "react";
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
    if (emailPrefill) {
      form.setValue("email", emailPrefill);
    }
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
      const msg =
        e instanceof ApiError
          ? e.message
          : "Could not reset password. Try again or request a new code.";
      setFormState({
        status: "error",
        message: msg,
      });
    }
  };

  const isLoading = formState.status === "loading";

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
          Enter the code from your email, then choose a new password.
        </p>
      </div>

      {formState.status === "error" && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{formState.message}</p>
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

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? "Updating password…" : "Update password"}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        <Link href="/auth/forgot-password" className="text-blue-400 hover:text-blue-300">
          Request a new code
        </Link>
      </p>
    </div>
  );
}
