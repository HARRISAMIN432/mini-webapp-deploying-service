"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-white tracking-tight mb-1"
          style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.02em" }}
        >
          Create your account
        </h1>
        <p
          className="text-[#6b7280] text-sm"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Start deploying in under 2 minutes — no credit card required
        </p>
      </div>

      <OAuthButtons mode="signup" />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span
          className="text-[#374151] text-xs uppercase tracking-widest"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          or
        </span>
        <div className="flex-1 h-px bg-white/[0.06]" />
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
        <div className="flex items-start gap-3 pt-0.5">
          <Checkbox
            id="acceptTerms"
            checked={form.watch("acceptTerms")}
            onCheckedChange={(checked) =>
              form.setValue("acceptTerms", checked as boolean, {
                shouldValidate: true,
              })
            }
            className="mt-0.5 border-white/[0.15] data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 rounded-md"
          />
          <div className="flex-1">
            <label
              htmlFor="acceptTerms"
              className="text-[#6b7280] text-sm leading-relaxed cursor-pointer"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              I agree to the{" "}
              <Link
                href="/terms"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Privacy Policy
              </Link>
            </label>
            {form.formState.errors.acceptTerms && (
              <p
                className="text-red-400 text-xs mt-1"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {form.formState.errors.acceptTerms.message}
              </p>
            )}
          </div>
        </div>

        {/* Submit button */}
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
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background:
                "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)",
            }}
          />
          <span className="relative flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating account…
              </>
            ) : (
              <>
                Create account{" "}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
              </>
            )}
          </span>
        </button>
      </form>

      <p
        className="text-center text-sm text-[#4b5563]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
