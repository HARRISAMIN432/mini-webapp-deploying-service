"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { signUpSchema, type SignUpFormValues } from "@/lib/validations/auth";
import { AuthFormState } from "@/lib/types/auth";
import { apiRequest, ApiError } from "@/lib/api";
import { usePasswordToggle } from "@/lib/hooks/usePasswordToggle";

import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthInputField } from "@/components/auth/AuthInputField";
import { EyeToggle } from "@/components/auth/EyeToggle";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

export default function SignUpPage() {
  const router = useRouter();
  const passwordToggle = usePasswordToggle();
  const confirmToggle = usePasswordToggle();
  const [formState, setFormState] = useState<AuthFormState>({ status: "idle" });

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
    mode: "onBlur",
  });

  const watchedPassword = form.watch("password");

  const onSubmit = async (values: SignUpFormValues) => {
    try {
      setFormState({ status: "loading" });
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setFormState({
        status: "success",
        message: "Check your email for a verification code.",
      });
      router.push(
        `/auth/verify-email?email=${encodeURIComponent(values.email)}`,
      );
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h1
          className="text-2xl font-bold text-white tracking-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Create your account
        </h1>
        <p className="text-gray-500 text-sm">
          Start deploying in under 2 minutes
        </p>
      </div>

      {/* OAuth */}
      <OAuthButtons mode="signup" />

      <AuthDivider label="or sign up with email" />

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

      {/* Form */}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <AuthInputField
          control={form.control}
          name="name"
          label="Full name"
          placeholder="Ahmed Khan"
          autoComplete="name"
        />

        <AuthInputField
          control={form.control}
          name="email"
          label="Email address"
          placeholder="you@company.com"
          type="email"
          autoComplete="email"
        />

        <div>
          <AuthInputField
            control={form.control}
            name="password"
            label="Password"
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
          label="Confirm password"
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

        {/* Terms checkbox */}
        <div className="flex items-start gap-3 pt-1">
          <Checkbox
            id="acceptTerms"
            checked={form.watch("acceptTerms")}
            onCheckedChange={(checked) =>
              form.setValue("acceptTerms", checked as boolean, {
                shouldValidate: true,
              })
            }
            className="mt-0.5 border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <div className="flex-1">
            <label
              htmlFor="acceptTerms"
              className="text-gray-400 text-sm font-normal leading-relaxed cursor-pointer"
            >
              I agree to the{" "}
              <Link
                href="/terms"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Privacy Policy
              </Link>
            </label>
            {form.formState.errors.acceptTerms && (
              <p className="text-red-400 text-xs mt-1">
                {form.formState.errors.acceptTerms.message}
              </p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
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
              Creating account…
            </span>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      {/* Login link */}
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
