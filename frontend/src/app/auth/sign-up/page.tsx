// app/auth/sign-up/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

import { signUpSchema, type SignUpFormValues } from "@/lib/validations/auth";
import { AuthFormState } from "@/lib/types/auth";
import { apiRequest, ApiError } from "@/lib/api";
import { usePasswordToggle } from "@/lib/hooks/usePasswordToggle";

import { OAuthButtons } from "@/components/auth/OAuthButtons";
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Create your account
        </h1>
        <p className="text-sm text-gray-500">
          Start deploying in under 2 minutes
        </p>
      </div>

      <OAuthButtons mode="signup" />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium uppercase">or</span>
        <div className="flex-1 h-px bg-gray-200" />
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

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="acceptTerms"
            checked={form.watch("acceptTerms")}
            onChange={(e) =>
              form.setValue("acceptTerms", e.target.checked, {
                shouldValidate: true,
              })
            }
            className="mt-1 w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          <label htmlFor="acceptTerms" className="text-sm text-gray-600">
            I agree to the{" "}
            <Link
              href="/terms"
              className="text-violet-600 hover:text-violet-700"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-violet-600 hover:text-violet-700"
            >
              Privacy Policy
            </Link>
          </label>
        </div>
        {form.formState.errors.acceptTerms && (
          <p className="text-xs text-red-500">
            {form.formState.errors.acceptTerms.message}
          </p>
        )}

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
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-violet-600 hover:text-violet-700 font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
