"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("isNew") === "true";
  const error = searchParams.get("error");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (error) return;
    const t = setTimeout(() => {
      setDone(true);
      router.replace("/dashboard");
    }, 1200);
    return () => clearTimeout(t);
  }, [router, error]);

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
        <svg
          className="w-7 h-7 text-blue-400 animate-spin"
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
      </div>
      <div>
        <h1
          className="text-xl font-bold text-white mb-2"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {error ? "Sign-in cancelled" : done ? "Redirecting…" : "Signing you in…"}
        </h1>
        <p className="text-gray-400 text-sm">
          {error
            ? "No worries — you can try again anytime."
            : isNew
              ? "Welcome! Your account is ready."
              : "Welcome back to ShipStack."}
        </p>
      </div>
      <Link
        href={error ? "/auth/login" : "/dashboard"}
        className="inline-block text-sm text-blue-400 hover:text-blue-300"
      >
        {error ? "Back to sign in" : "Continue to dashboard"}
      </Link>
    </div>
  );
}
