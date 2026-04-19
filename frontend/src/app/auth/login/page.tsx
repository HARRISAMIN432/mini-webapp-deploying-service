"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { AuthFormState } from "@/lib/types/auth";
import { usePasswordToggle } from "@/lib/hooks/usePasswordToggle";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthInputField } from "@/components/auth/AuthInputField";
import { EyeToggle } from "@/components/auth/EyeToggle";

type LoginFormData = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export default function LoginPage() {
  const router = useRouter();
  const { showPassword, toggle, inputType } = usePasswordToggle();
  const [formState, setFormState] = useState<AuthFormState>({ status: "idle" });

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as any,
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    mode: "onBlur",
  });

  const onSubmit = async (values: LoginFormData) => {
    try {
      setFormState({ status: "loading" });

      // TODO: replace with your API call
      // const res = await fetch("/api/auth/login", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(values),
      // });

      await new Promise((r) => setTimeout(r, 1200)); // placeholder

      setFormState({ status: "success", message: "Logged in successfully!" });
      router.push("/dashboard");
    } catch {
      setFormState({
        status: "error",
        message: "Invalid email or password. Please try again.",
      });
    }
  };

  const isLoading = formState.status === "loading";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1
          className="text-2xl font-bold text-white tracking-tight"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Welcome back
        </h1>
        <p className="text-gray-500 text-sm">
          Sign in to your ShipStack workspace
        </p>
      </div>

      {/* OAuth */}
      <OAuthButtons mode="login" />

      <AuthDivider label="or continue with email" />

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
          name="email"
          label="Email address"
          placeholder="you@company.com"
          type="email"
          autoComplete="email"
        />

        <AuthInputField
          control={form.control}
          name="password"
          label="Password"
          placeholder="••••••••"
          type={inputType}
          autoComplete="current-password"
          rightElement={<EyeToggle show={showPassword} onToggle={toggle} />}
        />

        {/* Remember me + Forgot */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={form.watch("rememberMe")}
              onCheckedChange={(checked) =>
                form.setValue("rememberMe", checked as boolean)
              }
              className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <span className="text-gray-400 text-sm font-normal">
              Remember me
            </span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
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
              Signing in…
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Sign up link */}
      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/sign-up"
          className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          Create one free
        </Link>
      </p>
    </div>
  );
}
