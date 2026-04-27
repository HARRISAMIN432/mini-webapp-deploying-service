// components/auth/OAuthButtons.tsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { OAUTH_PROVIDERS } from "@/config/oauth-providers";
import { OAuthProvider } from "@/lib/types/auth";
import { getOAuthStartUrl } from "@/lib/api";

interface OAuthButtonsProps {
  mode: "login" | "signup";
}

export function OAuthButtons({ mode }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(
    null,
  );

  const handleOAuth = (providerId: OAuthProvider) => {
    setLoadingProvider(providerId);
    window.location.href = getOAuthStartUrl(providerId);
  };

  return (
    <div className="flex flex-col gap-2">
      {OAUTH_PROVIDERS.map((provider) => {
        const isLoading = loadingProvider === provider.id;
        const isDisabled = !!loadingProvider;

        return (
          <button
            key={provider.id}
            type="button"
            disabled={isDisabled}
            onClick={() => handleOAuth(provider.id)}
            className="flex items-center justify-center gap-2.5 w-full h-11 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg
                viewBox={provider.viewBox}
                className="w-4 h-4 flex-shrink-0"
                fill="currentColor"
              >
                <path d={provider.iconPath} />
              </svg>
            )}
            {mode === "login" ? "Continue" : "Sign up"} with {provider.label}
          </button>
        );
      })}
    </div>
  );
}
