"use client";

import { useState } from "react";
import { OAUTH_PROVIDERS } from "@/config/oauth-providers";
import { OAuthProvider } from "@/lib/types/auth";
import { getOAuthStartUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface OAuthButtonsProps {
  mode: "login" | "signup";
  className?: string;
}

export function OAuthButtons({ mode, className }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(
    null,
  );

  const handleOAuth = (providerId: OAuthProvider) => {
    setLoadingProvider(providerId);
    window.location.href = getOAuthStartUrl(providerId);
  };

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {OAUTH_PROVIDERS.map((provider) => {
        const isLoading = loadingProvider === provider.id;

        return (
          <button
            key={provider.id}
            type="button"
            disabled={!!loadingProvider}
            onClick={() => handleOAuth(provider.id)}
            className={cn(
              "relative flex items-center justify-center gap-3 w-full h-11 rounded-xl border text-sm font-medium transition-all duration-150",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              provider.bgClass,
              provider.textClass,
              provider.borderClass,
            )}
          >
            {isLoading ? (
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
            ) : (
              <svg
                viewBox={provider.viewBox}
                className="w-4 h-4 flex-shrink-0"
                fill="currentColor"
              >
                <path d={provider.iconPath} />
              </svg>
            )}
            <span>
              {mode === "login" ? "Continue" : "Sign up"} with {provider.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
